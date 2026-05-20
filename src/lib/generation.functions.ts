import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { falRun, falSubmit, falStatus, falResult, fetchAsBuffer } from "./fal.server";
import { imageCost, videoCost } from "./costs";

const FLUX_MODEL = "fal-ai/flux/schnell";
const KLING_MODEL = "fal-ai/kling-video/v1.6/standard/image-to-video";

type FluxOut = { images: Array<{ url: string }> };
type KlingOut = { video: { url: string } };

// ----- Roteiro via Lovable AI -----
async function generateScript(prompt: string, numScenes: number): Promise<Array<{ prompt: string }>> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const sys = `Você é um roteirista. Divida o tema do usuário em exatamente ${numScenes} cenas visuais curtas. Responda APENAS um JSON: {"scenes":[{"prompt":"descrição visual cinematográfica em inglês, 1-2 frases"}]}. Sem markdown.`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as { scenes: Array<{ prompt: string }> };
  return parsed.scenes.slice(0, numScenes);
}

// ----- Criar projeto + cenas -----
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

// ----- Gerar imagem (avulsa ou de uma cena) -----
async function uploadToBucket(bucket: string, path: string, buf: ArrayBuffer, contentType: string) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function bumpSpent(userId: string, amount: number) {
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("total_spent_usd")
    .eq("user_id", userId)
    .maybeSingle();
  const next = Number(prof?.total_spent_usd ?? 0) + amount;
  await supabaseAdmin.from("profiles").update({ total_spent_usd: next }).eq("user_id", userId);
}

async function bumpProjectCost(projectId: string, amount: number) {
  const { data: p } = await supabaseAdmin
    .from("projects")
    .select("total_cost_usd")
    .eq("id", projectId)
    .maybeSingle();
  const next = Number(p?.total_cost_usd ?? 0) + amount;
  await supabaseAdmin.from("projects").update({ total_cost_usd: next }).eq("id", projectId);
}

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

    // Se for de uma cena, marca status
    if (data.sceneId) {
      await supabaseAdmin
        .from("project_scenes")
        .update({ status: "generating_image" })
        .eq("id", data.sceneId);
    }

    try {
      const out = await falRun<FluxOut>(FLUX_MODEL, {
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

      await supabaseAdmin.from("generated_images").insert({
        user_id: userId,
        prompt: data.prompt,
        image_url: publicUrl,
        model: "flux/schnell",
        cost_usd: cost,
        status: "ready",
      });

      if (data.sceneId) {
        await supabaseAdmin
          .from("project_scenes")
          .update({
            image_url: publicUrl,
            status: "pending",
            cost_usd: cost,
          })
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
      await supabaseAdmin.from("generated_images").insert({
        user_id: userId,
        prompt: data.prompt,
        image_url: "",
        model: "flux/schnell",
        cost_usd: 0,
        status: "failed",
        error_message: msg,
      });
      throw e;
    }
  });

// ----- Animar cena (imagem → vídeo) -----
export const startSceneVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sceneId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: scene, error } = await supabase
      .from("project_scenes")
      .select("*, projects!inner(user_id)")
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

    const result = await falResult<KlingOut>(KLING_MODEL, scene.fal_request_id);
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