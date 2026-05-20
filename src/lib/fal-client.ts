import { fal } from "@fal-ai/client";

export function configureFal(apiKey: string) {
  fal.config({ credentials: apiKey });
}

export const IMAGE_MODELS = [
  { id: "fal-ai/flux/schnell", name: "Flux Schnell", provider: "fal.ai", speed: "Rápido", cost_per_image: "$0.003", supports_image_input: false },
  { id: "fal-ai/flux-pro/v1.1", name: "Flux Pro 1.1", provider: "fal.ai", speed: "Médio", cost_per_image: "$0.04", supports_image_input: false },
  { id: "xai/grok-imagine-image", name: "Grok Imagine", provider: "xAI", speed: "Médio", cost_per_image: "$0.02", supports_image_input: false },
  { id: "xai/grok-imagine-image/edit", name: "Grok Imagine Edit", provider: "xAI", speed: "Médio", cost_per_image: "$0.022", supports_image_input: true },
  { id: "fal-ai/gpt-image-1/text-to-image", name: "GPT Image 1", provider: "OpenAI", speed: "Lento", cost_per_image: "$0.04", supports_image_input: false },
  { id: "fal-ai/imagen3", name: "Imagen 3", provider: "Google", speed: "Médio", cost_per_image: "$0.04", supports_image_input: false },
] as const;

export type ImageModel = (typeof IMAGE_MODELS)[number];

export const VIDEO_MODELS = [
  { id: "fal-ai/kling-video/v1.6/standard/text-to-video", id_img: "fal-ai/kling-video/v1.6/standard/image-to-video", name: "Kling 1.6 Standard", provider: "Kling", cost_per_5s: 0.42, cost_per_10s: 0.84, max_duration: 10 },
  { id: "fal-ai/kling-video/v1.6/pro/text-to-video", id_img: "fal-ai/kling-video/v1.6/pro/image-to-video", name: "Kling 1.6 Pro", provider: "Kling", cost_per_5s: 0.84, cost_per_10s: 1.68, max_duration: 10 },
  { id: "xai/grok-imagine-video/text-to-video", id_img: "xai/grok-imagine-video/image-to-video", name: "Grok Imagine Video", provider: "xAI", cost_per_5s: 0.25, cost_per_10s: 0.50, max_duration: 10 },
  { id: "fal-ai/veo3", id_img: "fal-ai/veo3/image-to-video", name: "Google Veo 3", provider: "Google", cost_per_5s: 0.75, cost_per_10s: 1.50, max_duration: 8 },
] as const;

export type VideoModel = (typeof VIDEO_MODELS)[number];

export const FORMATS = [
  { id: "landscape_16_9", label: "YouTube / HD", ratio: "16:9", icon: "🖥️" },
  { id: "portrait_9_16", label: "Stories / Reels", ratio: "9:16", icon: "📱" },
  { id: "square_hd", label: "Feed Quadrado", ratio: "1:1", icon: "⬛" },
  { id: "portrait_4_5", label: "Feed Vertical", ratio: "4:5", icon: "📷" },
] as const;

export function ratioToAspect(formatId: string): string {
  const map: Record<string, string> = {
    landscape_16_9: "16:9",
    portrait_9_16: "9:16",
    square_hd: "1:1",
    portrait_4_5: "4:5",
  };
  return map[formatId] ?? "16:9";
}

export const IMAGE_QUALITIES = [
  { id: "1k", label: "1K — Padrão", description: "Rápido e econômico", multiplier: 1 },
  { id: "2k", label: "2K — Alta", description: "Melhor qualidade, +50% custo", multiplier: 1.5 },
] as const;

export async function generateImage(params: {
  apiKey: string;
  modelId: string;
  prompt: string;
  formatId: string;
  quality: string;
  image_url?: string;
  onProgress?: (msg: string) => void;
}): Promise<{ url: string; cost_estimate: string }> {
  configureFal(params.apiKey);
  const aspect = ratioToAspect(params.formatId);
  const model = IMAGE_MODELS.find((m) => m.id === params.modelId)!;

  let input: Record<string, unknown> = { prompt: params.prompt };

  if (params.modelId.startsWith("xai/")) {
    input = { prompt: params.prompt, aspect_ratio: aspect, resolution: params.quality, num_images: 1 };
    if (params.image_url && params.modelId.includes("/edit")) {
      input.image_urls = [params.image_url];
    }
  } else if (params.modelId.includes("flux")) {
    input = {
      prompt: params.prompt,
      image_size: params.formatId,
      num_inference_steps: params.quality === "2k" ? 28 : 4,
      num_images: 1,
      enable_safety_checker: false,
    };
  } else if (params.modelId.includes("gpt-image")) {
    input = { prompt: params.prompt, image_size: params.formatId };
  } else if (params.modelId.includes("imagen")) {
    input = { prompt: params.prompt, aspect_ratio: aspect };
  }

  params.onProgress?.("Gerando imagem...");

  const result = await fal.subscribe(params.modelId, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        params.onProgress?.(update.logs?.slice(-1)[0]?.message ?? "Processando...");
      }
    },
  });

  const data = result.data as Record<string, unknown> as {
    images?: { url: string }[];
    image?: { url: string };
    output?: string;
  };
  const url = data.images?.[0]?.url ?? data.image?.url ?? data.output ?? "";
  return { url, cost_estimate: model.cost_per_image };
}

export async function generateClip(params: {
  apiKey: string;
  modelId: string;
  modelIdImg: string;
  prompt: string;
  aspect_ratio: string;
  duration: number;
  image_url?: string;
  onProgress?: (msg: string) => void;
}): Promise<{ url: string }> {
  configureFal(params.apiKey);
  const modelToUse = params.image_url ? params.modelIdImg : params.modelId;
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspect_ratio,
    duration: String(params.duration),
  };
  if (params.image_url) input.image_url = params.image_url;

  params.onProgress?.("Iniciando geração...");

  const result = await fal.subscribe(modelToUse, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        params.onProgress?.(update.logs?.slice(-1)[0]?.message ?? "Gerando clipe...");
      }
    },
  });

  const data = result.data as { video?: { url: string }; output?: string };
  const url = data.video?.url ?? data.output ?? "";
  return { url };
}

function splitPromptIntoScenes(prompt: string, n: number): string[] {
  if (n === 1) return [prompt];
  const progress = ["beginning", "early", "middle", "later", "end"];
  return Array.from({ length: n }, (_, i) => {
    const p = progress[Math.min(i, progress.length - 1)];
    return `Scene ${i + 1} of ${n}, ${p} of the story: ${prompt}. Continuous cinematic style.`;
  });
}

export async function generateLongVideo(params: {
  apiKey: string;
  modelConfig: VideoModel;
  prompt: string;
  totalDuration: number;
  sceneDuration: number;
  formatId: string;
  image_url?: string;
  onSceneProgress?: (done: number, total: number, msg: string) => void;
  onClipReady?: (index: number, url: string) => void;
}): Promise<{ clips: string[]; merged_url: string | null }> {
  const aspect = ratioToAspect(params.formatId);
  const totalScenes = Math.max(1, Math.ceil(params.totalDuration / params.sceneDuration));
  const scenes = splitPromptIntoScenes(params.prompt, totalScenes);

  const clips: string[] = [];
  for (let i = 0; i < scenes.length; i += 3) {
    const batch = scenes.slice(i, i + 3);
    params.onSceneProgress?.(i, scenes.length, `Gerando cenas ${i + 1}–${Math.min(i + 3, scenes.length)} de ${scenes.length}...`);

    const results = await Promise.all(
      batch.map((scene) =>
        generateClip({
          apiKey: params.apiKey,
          modelId: params.modelConfig.id,
          modelIdImg: params.modelConfig.id_img,
          prompt: scene,
          aspect_ratio: aspect,
          duration: params.sceneDuration,
          image_url: params.image_url,
        }),
      ),
    );
    results.forEach((r, j) => {
      clips.push(r.url);
      params.onClipReady?.(i + j, r.url);
    });
  }

  params.onSceneProgress?.(scenes.length, scenes.length, "Unindo cenas...");

  let merged_url: string | null = null;
  if (clips.length > 1) {
    try {
      configureFal(params.apiKey);
      const mergeResult = await fal.subscribe("fal-ai/ffmpeg-api/compose", {
        input: {
          tracks: [
            {
              id: "1",
              type: "video",
              keyframes: clips.map((url, idx) => ({
                url,
                timestamp: idx * params.sceneDuration,
                duration: params.sceneDuration,
              })),
            },
          ],
        },
      });
      const data = mergeResult.data as { video_url?: string; video?: { url: string } };
      merged_url = data.video_url ?? data.video?.url ?? clips[clips.length - 1];
    } catch {
      merged_url = clips[clips.length - 1];
    }
  } else {
    merged_url = clips[0] ?? null;
  }

  return { clips, merged_url };
}