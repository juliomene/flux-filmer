import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { falRun, falSubmit, falStatus, falResult } from "./fal.server";
import { imageCost, videoCost } from "./costs";
import {
  uploadToBucket,
  bumpSpent,
  bumpProjectCost,
  insertGeneratedImage,
  generateScript,
  fetchAsBuffer,
} from "./generation.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FLUX_MODEL = "fal-ai/flux/schnell";
const KLING_MODEL = "fal-ai/kling-video/v1.6/standard/image-to-video";

export const createProjectFromPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(1).max(120),
        prompt: z.string().min(5).max(2000),
        numScenes: z.number().int().min(1).max(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: data.title,
        prompt: data.prompt,
        status: "generating_script",
        num_scenes: data.numScenes,
      })
      .select()
      .single();
    if (pErr || !project) throw new Error(pErr?.message ?? "Erro ao criar projeto");

    try {
      const scenes = await generateScript(data.prompt, data.numScenes);
      const rows = scenes.map((s, i) => ({
        project_id: project.id,
        scene_index: i,
        prompt: s.prompt,
        duration_s: 5,
        status: "pending" as const,
      }));
      const { error: sErr } = await supabase.from("project_scenes").insert(rows);
      if (sErr) throw new Error(sErr.message);

      await supabase.from("projects").update({ status: "draft" }).eq("id", project.id);
      return { projectId: project.id };
    } catch (e) {
      await supabase
        .from("projects")
        .update({ status: "failed", error_message: (e as Error).message })
        .eq("id", project.id);
      throw e;
    }
  });

export const generateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(3).max(2000),
        sceneId: z.string().uuid().optional(),
        projectId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    if (data.sceneId) {
      await supabaseAdmin
        .from("project_scenes")
        .update({ status: "generating_image" })
        .eq("id", data.sceneId);
    }

    try {
      const out = await falRun<{ images: Array<{ url: string }> }>(FLUX_MODEL, {
        prompt: data.prompt,
        image_size: "landscape_16_9",
        num_images: 1,
        enable_safety_checker: true,
      });
      const url = out.images?.[0]?.url;
      if (!url) throw new Error("Sem imagem retornada");

      const { data: buf, contentType } = await fetchAsBuffer(url);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const publicUrl = await uploadToBucket("images", path, buf, contentType);

      const cost = imageCost();

      await insertGeneratedImage({
        userId,
        prompt: data.prompt,
        imageUrl: publicUrl,
        cost,
        status: "ready",
      });

      if (data.sceneId) {
        await supabaseAdmin
          .from("project_scenes")
          .update({ image_url: publicUrl, status: "pending", cost_usd: cost })
          .eq("id", data.sceneId);
      }
      if (data.projectId) await bumpProjectCost(data.projectId, cost);
      await bumpSpent(userId, cost);

      return { url: publicUrl, cost };
    } catch (e) {
      const msg = (e as Error).message;
      if (data.sceneId) {
        await supabaseAdmin
          .from("project_scenes")
          .update({ status: "failed" })
          .eq("id", data.sceneId);
      }
      await insertGeneratedImage({
        userId,
        prompt: data.prompt,
        imageUrl: "",
        cost: 0,
        status: "failed",
        errorMessage: msg,
      });
      throw e;
    }
  });

export const startSceneVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sceneId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: scene, error } = await supabase
      .from("project_scenes")
      .select("*")
      .eq("id", data.sceneId)
      .single();
    if (error || !scene) throw new Error("Cena não encontrada");
    if (!scene.image_url) throw new Error("Cena precisa de uma imagem antes");

    const requestId = await falSubmit(KLING_MODEL, {
      prompt: scene.prompt,
      image_url: scene.image_url,
      duration: String(scene.duration_s ?? 5),
    });

    await supabaseAdmin
      .from("project_scenes")
      .update({ status: "generating_clip", fal_request_id: requestId })
      .eq("id", data.sceneId);

    return { requestId };
  });

export const pollScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sceneId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: scene } = await supabase
      .from("project_scenes")
      .select("*")
      .eq("id", data.sceneId)
      .single();
    if (!scene) throw new Error("Cena não encontrada");
    if (scene.status !== "generating_clip" || !scene.fal_request_id) {
      return { status: scene?.status ?? "unknown" };
    }

    const st = await falStatus(KLING_MODEL, scene.fal_request_id);
    if (st.status === "FAILED") {
      await supabaseAdmin
        .from("project_scenes")
        .update({ status: "failed" })
        .eq("id", data.sceneId);
      return { status: "failed" };
    }
    if (st.status !== "COMPLETED") return { status: "generating_clip" };

    const result = await falResult<{ video: { url: string } }>(KLING_MODEL, scene.fal_request_id);
    const videoUrl = result.video?.url;
    if (!videoUrl) {
      await supabaseAdmin
        .from("project_scenes")
        .update({ status: "failed" })
        .eq("id", data.sceneId);
      return { status: "failed" };
    }

    const { data: buf, contentType } = await fetchAsBuffer(videoUrl);
    const path = `${userId}/${scene.project_id}/${scene.id}.mp4`;
    const publicUrl = await uploadToBucket("videos", path, buf, contentType);

    const cost = videoCost(scene.duration_s ?? 5);
    const newTotal = Number(scene.cost_usd ?? 0) + cost;

    await supabaseAdmin
      .from("project_scenes")
      .update({ video_clip_url: publicUrl, status: "ready", cost_usd: newTotal })
      .eq("id", data.sceneId);
    await bumpProjectCost(scene.project_id, cost);
    await bumpSpent(userId, cost);

    return { status: "ready", url: publicUrl };
  });