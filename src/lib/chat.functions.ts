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
    image: "xai/grok-imagine-image",
    imageEdit: "xai/grok-imagine-image/edit",
    textToVideo: "xai/grok-imagine-video/text-to-video",
    imageToVideo: "xai/grok-imagine-video/image-to-video",
  },
  sora: {
    image: "fal-ai/gpt-image-1/text-to-image",
    imageEdit: "fal-ai/gpt-image-1/edit-image",
    textToVideo: "fal-ai/sora",
    imageToVideo: "fal-ai/sora",
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

// Extrai o último frame do vídeo (image url) via ffmpeg-api do fal.
async function extractLastFrame(videoUrl: string): Promise<string | null> {
  try {
    const out = await falRun("fal-ai/ffmpeg-api/extract-frame", {
      video_url: videoUrl,
      frame_type: "last",
    });
    const img = (out.image as { url?: string } | undefined)?.url;
    if (img) return img;
    const frame = (out.frame as { url?: string } | undefined)?.url;
    return frame ?? null;
  } catch {
    return null;
  }
}

// Concatena vários vídeos em sequência. Retorna a URL final.
async function mergeClips(clipUrls: string[], sceneDuration: number): Promise<string> {
  if (clipUrls.length === 1) return clipUrls[0];
  try {
    const out = await falRun("fal-ai/ffmpeg-api/compose", {
      tracks: [
        {
          id: "video",
          type: "video",
          keyframes: clipUrls.map((url, idx) => ({
            url,
            timestamp: idx * sceneDuration,
            duration: sceneDuration,
          })),
        },
      ],
    });
    const v = (out.video_url as string | undefined) ?? (out.video as { url?: string } | undefined)?.url;
    return v ?? clipUrls[clipUrls.length - 1];
  } catch {
    return clipUrls[clipUrls.length - 1];
  }
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
  totalDurationSeconds: z.number().int().min(5).max(180).optional(),
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
        let model: string;
        let input: Record<string, unknown>;
        if (provider === "xai") {
          if (data.imageUrl) {
            model = "xai/grok-imagine-image/edit";
            input = { prompt: data.prompt, image_urls: [data.imageUrl], resolution: "1k" };
          } else {
            model = "xai/grok-imagine-image";
            input = {
              prompt: data.prompt,
              aspect_ratio: data.aspectRatio,
              resolution: "1k",
              num_images: 1,
            };
          }
        } else if (provider === "sora") {
          if (data.imageUrl) {
            model = "fal-ai/gpt-image-1/edit-image";
            input = { prompt: data.prompt, image_url: data.imageUrl };
          } else {
            model = "fal-ai/gpt-image-1/text-to-image";
            input = { prompt: data.prompt, image_size: aspectToImageSize(data.aspectRatio) };
          }
        } else {
          model = cfg.image;
          input = {
            prompt: data.prompt,
            ...(data.imageUrl ? { image_url: data.imageUrl } : {}),
            image_size: aspectToImageSize(data.aspectRatio),
          };
        }
        const out = await falRun(model, input);
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
        // ── Vídeo: 1+ cenas encadeadas para manter o personagem ─────
        const sceneDur = data.durationSeconds;
        const totalDur = data.totalDurationSeconds ?? sceneDur;
        const sceneCount = Math.max(1, Math.ceil(totalDur / sceneDur));

        const clips: string[] = [];
        let nextSeedImage: string | undefined = data.imageUrl;

        for (let i = 0; i < sceneCount; i++) {
          const useImg = !!nextSeedImage;
          const model = useImg ? cfg.imageToVideo : cfg.textToVideo;
          // Mesmo prompt EXATO em todas as cenas — a fala/ação do usuário
          // deve ser obedecida em cada clipe. O encadeamento via último
          // frame mantém o personagem e o cenário.
          const out = await falRun(model, {
            prompt: data.prompt,
            ...(useImg ? { image_url: nextSeedImage } : {}),
            duration: String(sceneDur),
            aspect_ratio: data.aspectRatio,
          });
          const clipUrl = extractVideoUrl(out);
          clips.push(clipUrl);

          if (i < sceneCount - 1) {
            nextSeedImage = (await extractLastFrame(clipUrl)) ?? nextSeedImage;
          }
        }

        const finalUrl = await mergeClips(clips, sceneDur);
        resultType = "video";
        resultUrl = finalUrl;

        await supabase.from("generated_videos" as never).insert({
          user_id: userId,
          prompt: data.prompt,
          video_url: resultUrl,
          model: cfg.textToVideo,
          provider,
          status: "ready",
          duration_s: sceneCount * sceneDur,
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