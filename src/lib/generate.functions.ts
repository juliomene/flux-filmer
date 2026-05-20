import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateImage, startVideo, pollVideo } from "./providers.server";

const ProviderEnum = z.enum(["openai", "google", "xai", "anthropic", "replicate", "fal"]);

export const generateImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        provider: ProviderEnum,
        model: z.string().min(1).max(200),
        apiKey: z.string().min(4).max(500),
        prompt: z.string().min(1).max(4000),
        inputImageUrl: z.string().url().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    try {
      const out = await generateImage(data, userId);
      await supabase.from("generated_images").insert({
        user_id: userId,
        prompt: data.prompt,
        image_url: out.url,
        model: data.model,
        provider: data.provider,
        status: "ready",
      });
      return { url: out.url };
    } catch (e) {
      const msg = (e as Error).message;
      await supabase.from("generated_images").insert({
        user_id: userId,
        prompt: data.prompt,
        image_url: "",
        model: data.model,
        provider: data.provider,
        status: "failed",
        error_message: msg,
      });
      throw e;
    }
  });

export const startVideoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        provider: ProviderEnum,
        model: z.string().min(1).max(200),
        apiKey: z.string().min(4).max(500),
        prompt: z.string().min(1).max(4000),
        inputImageUrl: z.string().url().optional(),
        durationSeconds: z.number().int().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const start = await startVideo(data);
    const { data: row, error } = await supabase
      .from("generated_videos")
      .insert({
        user_id: userId,
        prompt: data.prompt,
        provider: data.provider,
        model: data.model,
        external_id: start.externalId,
        status: "processing",
        duration_s: data.durationSeconds ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Erro ao registrar vídeo");
    return { jobId: row.id, externalId: start.externalId };
  });

export const pollVideoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        jobId: z.string().uuid(),
        apiKey: z.string().min(4).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: row, error } = await supabase
      .from("generated_videos")
      .select("*")
      .eq("id", data.jobId)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Error("Vídeo não encontrado");
    if (row.status === "ready") return { status: "ready" as const, url: row.video_url ?? "" };
    if (row.status === "failed") return { status: "failed" as const, error: row.error_message ?? "falhou" };
    if (!row.external_id) return { status: "processing" as const };

    const result = await pollVideo(
      row.provider as never,
      row.model,
      data.apiKey,
      row.external_id,
      userId,
    );
    if (result.status === "ready") {
      await supabase
        .from("generated_videos")
        .update({ status: "ready", video_url: result.url })
        .eq("id", row.id);
      return { status: "ready" as const, url: result.url };
    }
    if (result.status === "failed") {
      await supabase
        .from("generated_videos")
        .update({ status: "failed", error_message: result.error })
        .eq("id", row.id);
      return { status: "failed" as const, error: result.error };
    }
    return { status: "processing" as const };
  });