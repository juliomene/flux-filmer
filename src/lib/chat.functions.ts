import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Provider → fal.ai model mapping. Single FAL_KEY (server env) drives all.
const PROVIDER_MODELS = {
  kling: {
    image: "fal-ai/flux/schnell",
    textToVideo: "fal-ai/kling-video/v1.6/standard/text-to-video",
    imageToVideo: "fal-ai/kling-video/v1.6/standard/image-to-video",
  },
  xai: {
    image: "fal-ai/xai/grok-imagine-image",
    imageEdit: "fal-ai/xai/grok-imagine-image/edit",
    textToVideo: "fal-ai/xai/grok-imagine-video/text-to-video",
    imageToVideo: "fal-ai/xai/grok-imagine-video/image-to-video",
  },
  sora: {
    image: "fal-ai/gpt-image-1",
    textToVideo: "fal-ai/sora/text-to-video",
    imageToVideo: "fal-ai/sora/image-to-video",
  },
  veo3: {
    image: "fal-ai/imagen3",
    textToVideo: "fal-ai/veo3",
    imageToVideo: "fal-ai/veo3/image-to-video",
  },
} as const;

type ProviderId = keyof typeof PROVIDER_MODELS;

function aspectToImageSize(ar: string) {
  if (ar === "9:16") return "portrait_16_9";
  if (ar === "1:1") return "square_hd";
  return "landscape_16_9";
}

async function falRun(model: string, input: Record<string, unknown>) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada no servidor.");
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = (await res.text()).slice(0, 500);
    throw new Error(`fal ${model}: ${res.status} ${txt}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function extractImageUrl(data: Record<string, unknown>): string {
  const images = data.images as Array<{ url: string }> | undefined;
  if (images?.[0]?.url) return images[0].url;
  const image = data.image as { url?: string } | undefined;
  if (image?.url) return image.url;
  throw new Error("Resposta sem imagem.");
}

function extractVideoUrl(data: Record<string, unknown>): string {
  const video = data.video as { url?: string } | undefined;
  if (video?.url) return video.url;
  const output = data.output as { video?: { url?: string } } | undefined;
  if (output?.video?.url) return output.video.url;
  throw new Error("Resposta sem vídeo.");
}

// ── Create conversation ─────────────────────────────────────────
export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        title: z.string().max(120).optional(),
        provider: z.enum(["kling", "xai", "sora", "veo3"]).default("kling"),
        mode: z.enum(["image", "video"]).default("image"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("chat_conversations" as never)
      .insert({
        user_id: userId,
        title: data.title ?? "Nova conversa",
        provider: data.provider,
        mode: data.mode,
      } as never)
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao criar conversa");
    return { id: (row as { id: string }).id };
  });

// ── Send message + generate ─────────────────────────────────────
const SendSchema = z.object({
  conversationId: z.string().uuid(),
  prompt: z.string().min(1).max(4000),
  mode: z.enum(["image", "video"]),
  provider: z.enum(["kling", "xai", "sora", "veo3"]),
  imageUrl: z.string().url().optional(),
  durationSeconds: z.number().int().min(3).max(10).default(5),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => SendSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) persist user message
    await supabase.from("chat_messages" as never).insert({
      conversation_id: data.conversationId,
      role: "user",
      content: data.prompt,
      attachments: data.imageUrl ? [{ url: data.imageUrl, type: "image" }] : [],
    } as never);

    // 2) bump conversation
    await supabase
      .from("chat_conversations" as never)
      .update({ updated_at: new Date().toISOString(), mode: data.mode, provider: data.provider } as never)
      .eq("id", data.conversationId);

    // 3) run generation
    const provider = data.provider as ProviderId;
    const cfg = PROVIDER_MODELS[provider];

    try {
      let resultType: "image" | "video";
      let resultUrl: string;

      if (data.mode === "image") {
        const model =
          data.imageUrl && provider === "xai" && "imageEdit" in cfg
            ? (cfg as { imageEdit: string }).imageEdit
            : cfg.image;
        const out = await falRun(model, {
          prompt: data.prompt,
          ...(data.imageUrl ? { image_url: data.imageUrl } : {}),
          image_size: aspectToImageSize(data.aspectRatio),
        });
        resultType = "image";
        resultUrl = extractImageUrl(out);

        await supabase.from("generated_images" as never).insert({
          user_id: userId,
          prompt: data.prompt,
          image_url: resultUrl,
          model,
          provider,
          status: "ready",
        } as never);
      } else {
        const model = data.imageUrl ? cfg.imageToVideo : cfg.textToVideo;
        const out = await falRun(model, {
          prompt: data.prompt,
          ...(data.imageUrl ? { image_url: data.imageUrl } : {}),
          duration: String(data.durationSeconds),
          aspect_ratio: data.aspectRatio,
        });
        resultType = "video";
        resultUrl = extractVideoUrl(out);

        await supabase.from("generated_videos" as never).insert({
          user_id: userId,
          prompt: data.prompt,
          video_url: resultUrl,
          model,
          provider,
          status: "ready",
          duration_s: data.durationSeconds,
        } as never);
      }

      // 4) persist assistant message
      const { data: msg, error: msgErr } = await supabase
        .from("chat_messages" as never)
        .insert({
          conversation_id: data.conversationId,
          role: "assistant",
          content: null,
          result_type: resultType,
          result_url: resultUrl,
          metadata: { provider, mode: data.mode },
        } as never)
        .select("id")
        .single();
      if (msgErr) throw new Error(msgErr.message);

      return { messageId: (msg as { id: string }).id, resultType, resultUrl };
    } catch (e) {
      const errMsg = (e as Error).message;
      await supabase.from("chat_messages" as never).insert({
        conversation_id: data.conversationId,
        role: "assistant",
        content: errMsg,
        result_type: "error",
      } as never);
      throw e;
    }
  });

// ── Rename / delete conversation ────────────────────────────────
export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_conversations" as never)
      .update({ title: data.title } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_conversations" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });