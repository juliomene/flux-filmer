import { fal } from "@fal-ai/client";
import {
  type VideoManifest,
  type Scene,
  assembleScenePrompt,
  validateSceneRuntime,
} from "./video-manifest";

export function configureFal(apiKey: string) {
  fal.config({ credentials: apiKey });
}

// ── Idiomas suportados ──────────────────────────────────────────
export const LANGUAGES = [
  { code: "Portuguese", label: "🇧🇷 Português" },
  { code: "English",    label: "🇺🇸 English" },
  { code: "Spanish",    label: "🇪🇸 Español" },
  { code: "French",     label: "🇫🇷 Français" },
  { code: "Italian",    label: "🇮🇹 Italiano" },
  { code: "German",     label: "🇩🇪 Deutsch" },
  { code: "Japanese",   label: "🇯🇵 日本語" },
  { code: "Chinese",    label: "🇨🇳 中文" },
  { code: "Arabic",     label: "🇸🇦 العربية" },
] as const;

// Lista ampliada — todos os idiomas suportados pelos modelos da fal.ai (Kling, Veo, Grok).
// A IA traduz a copy automaticamente para o idioma escolhido via âncora do prompt.
export const EXTRA_LANGUAGES = [
  { code: "Korean",      label: "🇰🇷 한국어" },
  { code: "Russian",     label: "🇷🇺 Русский" },
  { code: "Hindi",       label: "🇮🇳 हिन्दी" },
  { code: "Turkish",     label: "🇹🇷 Türkçe" },
  { code: "Dutch",       label: "🇳🇱 Nederlands" },
  { code: "Polish",      label: "🇵🇱 Polski" },
  { code: "Swedish",     label: "🇸🇪 Svenska" },
  { code: "Norwegian",   label: "🇳🇴 Norsk" },
  { code: "Danish",      label: "🇩🇰 Dansk" },
  { code: "Finnish",     label: "🇫🇮 Suomi" },
  { code: "Greek",       label: "🇬🇷 Ελληνικά" },
  { code: "Hebrew",      label: "🇮🇱 עברית" },
  { code: "Thai",        label: "🇹🇭 ไทย" },
  { code: "Vietnamese",  label: "🇻🇳 Tiếng Việt" },
  { code: "Indonesian",  label: "🇮🇩 Bahasa Indonesia" },
  { code: "Malay",       label: "🇲🇾 Bahasa Melayu" },
  { code: "Filipino",    label: "🇵🇭 Filipino" },
  { code: "Ukrainian",   label: "🇺🇦 Українська" },
  { code: "Czech",       label: "🇨🇿 Čeština" },
  { code: "Romanian",    label: "🇷🇴 Română" },
  { code: "Hungarian",   label: "🇭🇺 Magyar" },
  { code: "Bulgarian",   label: "🇧🇬 Български" },
  { code: "Croatian",    label: "🇭🇷 Hrvatski" },
  { code: "Serbian",     label: "🇷🇸 Српски" },
  { code: "Slovak",      label: "🇸🇰 Slovenčina" },
  { code: "Catalan",     label: "🏴 Català" },
  { code: "Persian",     label: "🇮🇷 فارسی" },
  { code: "Bengali",     label: "🇧🇩 বাংলা" },
  { code: "Urdu",        label: "🇵🇰 اردو" },
  { code: "Tamil",       label: "🇮🇳 தமிழ்" },
  { code: "Swahili",     label: "🇰🇪 Kiswahili" },
] as const;

export const ALL_LANGUAGES = [...LANGUAGES, ...EXTRA_LANGUAGES] as const;

// Sobe um arquivo para o CDN da fal.ai (URL permanente reutilizável).
export async function uploadToFal(apiKey: string, file: File): Promise<string> {
  configureFal(apiKey);
  return await fal.storage.upload(file);
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
  { id: "fal-ai/kling-video/v1.6/standard/text-to-video", id_img: "fal-ai/kling-video/v1.6/standard/image-to-video", name: "Kling 1.6 Standard", provider: "Kling", quality: "480p", speed: "Normal", cost_per_5s: 0.42, cost_per_10s: 0.84, max_duration: 10, has_native_audio: false, note: "" },
  { id: "fal-ai/kling-video/v1.6/pro/text-to-video", id_img: "fal-ai/kling-video/v1.6/pro/image-to-video", name: "Kling 1.6 Pro", provider: "Kling", quality: "720p", speed: "Normal", cost_per_5s: 0.84, cost_per_10s: 1.68, max_duration: 10, has_native_audio: false, note: "" },
  { id: "xai/grok-imagine-video/text-to-video", id_img: "xai/grok-imagine-video/image-to-video", name: "Grok Imagine Video 480p", provider: "xAI", quality: "480p", speed: "Rápido", cost_per_5s: 0.25, cost_per_10s: 0.50, max_duration: 10, has_native_audio: true, resolution_param: "480p", note: "Mais rápido e econômico · Áudio nativo" },
  { id: "xai/grok-imagine-video/text-to-video", id_img: "xai/grok-imagine-video/image-to-video", name: "Grok Imagine Video 720p", provider: "xAI", quality: "720p", speed: "Normal", cost_per_5s: 0.50, cost_per_10s: 1.00, max_duration: 10, has_native_audio: true, resolution_param: "720p", note: "Alta qualidade · Áudio nativo sincronizado" },
  { id: "fal-ai/veo3", id_img: "fal-ai/veo3/image-to-video", name: "Google Veo 3", provider: "Google", quality: "1080p", speed: "Normal", cost_per_5s: 0.75, cost_per_10s: 1.50, max_duration: 8, has_native_audio: true, note: "Áudio nativo · Máxima qualidade" },
  // ── MiniMax / Hailuo ──
  { id: "fal-ai/minimax/hailuo-2.3/standard/text-to-video", id_img: "fal-ai/minimax/hailuo-2.3/standard/image-to-video", name: "Hailuo 2.3 Standard", provider: "MiniMax", quality: "768p", speed: "Normal", cost_per_5s: 0.23, cost_per_10s: 0.45, max_duration: 10, has_native_audio: false, note: "Alta consistência visual entre cenas" },
  { id: "fal-ai/minimax/hailuo-2.3/pro/text-to-video", id_img: "fal-ai/minimax/hailuo-2.3/pro/image-to-video", name: "Hailuo 2.3 Pro", provider: "MiniMax", quality: "1080p", speed: "Normal", cost_per_5s: 0.45, cost_per_10s: 0.90, max_duration: 10, has_native_audio: false, note: "1080p — melhor qualidade MiniMax" },
  { id: "fal-ai/minimax/hailuo-2.3-fast/standard/text-to-video", id_img: "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video", name: "Hailuo 2.3 Fast Standard", provider: "MiniMax", quality: "768p", speed: "Rápido", cost_per_5s: 0.18, cost_per_10s: 0.35, max_duration: 10, has_native_audio: false, note: "Versão rápida e econômica" },
  { id: "fal-ai/minimax/hailuo-2.3-fast/pro/text-to-video", id_img: "fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video", name: "Hailuo 2.3 Fast Pro", provider: "MiniMax", quality: "1080p", speed: "Rápido", cost_per_5s: 0.35, cost_per_10s: 0.70, max_duration: 10, has_native_audio: false, note: "Rápido + 1080p" },
  // ── ByteDance / Seedance ──
  { id: "bytedance/seedance-2.0/fast/text-to-video", id_img: "bytedance/seedance-2.0/fast/image-to-video", name: "Seedance 2.0 Fast", provider: "ByteDance", quality: "720p", speed: "Rápido", cost_per_5s: 1.21, cost_per_10s: 2.42, max_duration: 15, has_native_audio: true, note: "Áudio nativo sincronizado · Física real · Câmera cinemática" },
  { id: "bytedance/seedance-2.0/text-to-video", id_img: "bytedance/seedance-2.0/image-to-video", name: "Seedance 2.0 Pro", provider: "ByteDance", quality: "1080p", speed: "Normal", cost_per_5s: 1.52, cost_per_10s: 3.03, max_duration: 15, has_native_audio: true, note: "1080p · Áudio nativo · Máxima qualidade ByteDance" },
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

export const VIDEO_QUALITIES = [
  { id: "standard", label: "Standard", description: "480p — mais rápido e econômico", price_multiplier: 1 },
  { id: "pro", label: "Pro", description: "720p — melhor qualidade", price_multiplier: 2 },
] as const;

export type VideoQuality = (typeof VIDEO_QUALITIES)[number]["id"];

// Troca segmento "standard"/"pro" no model id (suportado por Kling).
export function resolveModelQuality(modelId: string, quality: VideoQuality): string {
  return modelId.replace(/\/(standard|pro)\//, `/${quality}/`);
}

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
  seed?: number;
  withAudio?: boolean;
  quality?: VideoQuality;
  modelResolution?: string;
  onProgress?: (msg: string) => void;
}): Promise<{ url: string }> {
  configureFal(params.apiKey);
  const modelToUse = params.image_url ? params.modelIdImg : params.modelId;
  let input: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspect_ratio,
    duration: String(params.duration),
  };
  if (params.image_url) input.image_url = params.image_url;
  // Kling aceita seed — fixa consistência visual entre cenas do mesmo projeto.
  if (modelToUse.includes("kling")) input.seed = params.seed ?? 42;

  // Hailuo / MiniMax — parâmetros específicos (duration: 6 ou 10)
  if (modelToUse.includes("minimax") || modelToUse.includes("hailuo")) {
    input = {
      prompt: params.prompt,
      duration: params.duration <= 6 ? 6 : 10,
      prompt_optimizer: true,
    };
    if (params.image_url) input.image_url = params.image_url;
  }

  // Seedance 2.0 — resolução, duração até 15s, áudio nativo opcional
  if (modelToUse.includes("seedance")) {
    input = {
      prompt: params.prompt,
      resolution: params.quality === "pro" ? "1080p" : "720p",
      duration: String(Math.min(params.duration, 15)),
      aspect_ratio: params.aspect_ratio,
      generate_audio: params.withAudio ?? false,
    };
    if (params.image_url) input.image_url = params.image_url;
    if (params.seed) input.seed = params.seed;
  }

  // xAI Grok Imagine Video — resolução 480p ou 720p
  if (modelToUse.includes("xai/grok-imagine-video")) {
    input = {
      prompt: params.prompt,
      aspect_ratio: params.aspect_ratio,
      duration: String(params.duration),
      resolution: params.modelResolution ?? "480p",
    };
    if (params.image_url) input.image_url = params.image_url;
  }

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

async function mergeVideoClips(apiKey: string, clips: string[], onProgress?: (msg: string) => void): Promise<string | null> {
  if (clips.length <= 1) return clips[0] ?? null;
  configureFal(apiKey);
  onProgress?.("Unindo cenas em um único MP4...");
  try {
    const res = await fal.subscribe("fal-ai/ffmpeg-api/merge-videos", {
      input: { video_urls: clips, target_fps: 24 },
      logs: true,
    });
    const d = res.data as { video?: { url: string }; video_url?: string; output_url?: string; url?: string };
    return d.video?.url ?? d.video_url ?? d.output_url ?? d.url ?? null;
  } catch (primaryError) {
    try {
      const res = await fal.subscribe("fal-ai/ffmpeg-api", {
        input: {
          function: "concat_videos",
          video_urls: clips,
          inputs: clips.map((url, i) => ({ type: "video", url, label: `c${i}` })),
          output_format: "mp4",
        },
      });
      const d = res.data as { video?: { url: string }; video_url?: string; output_url?: string; url?: string };
      return d.video?.url ?? d.video_url ?? d.output_url ?? d.url ?? null;
    } catch {
      // eslint-disable-next-line no-console
      console.error("[fal-client] falhou ao unir os clipes", primaryError);
      return null;
    }
  }
}

export function buildScenePrompts(params: {
  userPrompt: string;
  totalScenes: number;
  language: string;
  style?: string;
}): string[] {
  const { userPrompt, totalScenes, language, style = "cinematic" } = params;

  const visualAnchor = [
    `IMPORTANT CONTINUITY LOCK: Keep exact same character/model appearance, same face, same clothes, same hair, same body, same environment, same props, same lighting, same color grading and same ${style} camera style across every scene.`,
    `This is one continuous video split into short clips for generation. Every new scene must continue directly from the previous frame, not restart the story and not become a new video.`,
    `DO NOT change the character/model. DO NOT change the setting/cenario unless the current scene text explicitly says so. DO NOT repeat previous dialogue.`,
    `LANGUAGE RULE: The user prompt may be written in any language, but ALL spoken dialogue, voiceover, narration, captions, signs, and on-screen text in the final video MUST be translated to and rendered exclusively in ${language}. Do not mix languages. Translate any quoted dialogue from the prompt into natural, native-sounding ${language}, preserving meaning, tone and intent.`,
  ].join(" ");

  if (totalScenes === 1) return [`${visualAnchor} ${userPrompt}`];

  const sceneBlocks = splitPromptIntoSceneBlocks(userPrompt, totalScenes);
  const sharedContext = extractSharedVisualContext(userPrompt);
  const prompts = sceneBlocks.map((block, i) => [
    visualAnchor,
    `Scene ${i + 1} of ${totalScenes}. Continuation of previous scene. Chronological segment ${i + 1}/${totalScenes}.`,
    `Shared visual context to preserve exactly: ${sharedContext}`,
    `Current scene only — do not speak or show text from other scenes: ${block}`,
    `Dialogue rule: speak ONLY the dialogue/chunk present in Current scene. If the user's original prompt contains dialogue in another language, translate ONLY this current chunk to ${language}. Never repeat scene 1 dialogue in scene 2.`,
  ].join("\n"));
  // eslint-disable-next-line no-console
  console.log("[fal-client] scene prompts:", prompts);
  return prompts;
}

function splitPromptIntoSceneBlocks(prompt: string, totalScenes: number): string[] {
  const normalized = prompt.trim();
  const explicit = normalized
    .split(/(?=^\s*(?:🎬\s*)?(?:PARTE|CENA|SCENE)\s*\d+\b)/gim)
    .map((part) => part.trim())
    .filter(Boolean);
  if (explicit.length >= totalScenes) return normalizeSceneBlockCount(explicit, totalScenes);

  const paragraphs = normalized
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÀ-Ú“"'])/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length >= totalScenes) return normalizeSceneBlockCount(paragraphs, totalScenes);

  const words = normalized.split(/\s+/).filter(Boolean);
  const perScene = Math.max(1, Math.ceil(words.length / totalScenes));
  return Array.from({ length: totalScenes }, (_, i) => {
    const chunk = words.slice(i * perScene, (i + 1) * perScene).join(" ").trim();
    return chunk || `continuation beat ${i + 1}`;
  });
}

function normalizeSceneBlockCount(blocks: string[], totalScenes: number): string[] {
  if (blocks.length === totalScenes) return blocks;
  if (blocks.length < totalScenes) {
    return Array.from({ length: totalScenes }, (_, i) => blocks[i] ?? `silent continuation beat ${i + 1}`);
  }
  const out = blocks.slice(0, totalScenes - 1);
  out.push(blocks.slice(totalScenes - 1).join("\n\n"));
  return out;
}

function extractSharedVisualContext(prompt: string): string {
  const withoutDialogue = prompt
    .replace(/(?:di[aá]logo|dialogue|fala|narra[cç][aã]o)\s*\([^)]*\)?\s*:\s*[\s\S]*?(?=\n\s*(?:🎬\s*)?(?:PARTE|CENA|SCENE)\s*\d+\b|$)/gim, "")
    .replace(/“[^”]{3,}”|"[^"]{3,}"/g, "")
    .trim();
  return withoutDialogue || "same subject, same wardrobe, same environment and same camera setup described by the user";
}

function extractDialogueText(sceneBlock: string): string {
  const quoted = [...sceneBlock.matchAll(/[“"]([^”"]{2,})[”"]/g)].map((m) => m[1].trim()).filter(Boolean);
  if (quoted.length) return quoted.join(" ");
  const dialogueMatch = sceneBlock.match(/(?:di[aá]logo|dialogue|fala|narra[cç][aã]o)\s*\([^)]*\)?\s*:\s*([\s\S]*)/i);
  return (dialogueMatch?.[1] ?? sceneBlock).trim();
}

// CONSISTÊNCIA ENTRE CENAS:
// 1. Cada prompt de cena inclui a âncora visual do prompt original
// 2. A partir da cena 2, usa o último frame da cena anterior como image_url
// 3. Seed fixo por projeto para modelos que suportam (Kling)
// 4. Mesmo aspect_ratio e qualidade em todas as cenas
// 5. Mesmo model id em todas as cenas do mesmo projeto
export async function generateLongVideo(params: {
  apiKey: string;
  modelConfig: VideoModel;
  quality?: VideoQuality;
  prompt: string;
  totalDuration: number;
  sceneDuration: number;
  formatId: string;
  image_url?: string;
  language?: string;
  style?: string;
  audioType?: "none" | "music" | "speech" | "both";
  audioPrompt?: string;
  projectSeed?: number;
  onSceneProgress?: (done: number, total: number, msg: string) => void;
  onClipReady?: (index: number, url: string) => void;
}): Promise<{ clips: string[]; merged_url: string | null }> {
  configureFal(params.apiKey);
  const aspect = ratioToAspect(params.formatId);
  const totalScenes = Math.max(1, Math.ceil(params.totalDuration / params.sceneDuration));
  const language = params.language ?? "Portuguese";
  const audioType = params.audioType ?? "none";
  const scenes = buildScenePrompts({
    userPrompt: params.prompt,
    totalScenes,
    language,
    style: params.style,
  });
  const sceneBlocks = totalScenes > 1 ? splitPromptIntoSceneBlocks(params.prompt, totalScenes) : [params.prompt];
  const quality = params.quality ?? "standard";
  const seed = params.projectSeed ?? Math.floor(Math.random() * 100000);
  const modelId = resolveModelQuality(params.modelConfig.id, quality);
  const modelIdImg = resolveModelQuality(params.modelConfig.id_img, quality);
  const hasNativeAudio = (params.modelConfig as { has_native_audio?: boolean }).has_native_audio === true;
  const wantsAudio = audioType !== "none";
  const useNativeAudio = hasNativeAudio && wantsAudio;
  const useExternalSpeech = !useNativeAudio && (audioType === "speech" || audioType === "both");

  const clips: string[] = [];
  let lastFrameUrl: string | undefined = params.image_url;
  for (let i = 0; i < scenes.length; i++) {
    params.onSceneProgress?.(i, scenes.length, `Gerando cena ${i + 1} de ${scenes.length}...`);
    const clip = await generateClip({
      apiKey: params.apiKey,
      modelId,
      modelIdImg,
      prompt: scenes[i],
      aspect_ratio: aspect,
      duration: params.sceneDuration,
      image_url: lastFrameUrl,
      seed,
      withAudio: useNativeAudio,
      quality,
      modelResolution: (params.modelConfig as unknown as { resolution_param?: string }).resolution_param,
      onProgress: (msg) => params.onSceneProgress?.(i, scenes.length, msg),
    });
    let sceneUrl = clip.url;

    if (useExternalSpeech) {
      params.onSceneProgress?.(i, scenes.length, `Gerando fala da cena ${i + 1}...`);
      const audio = await generateSceneTTS({
        apiKey: params.apiKey,
        text: extractDialogueText(sceneBlocks[i]) || sceneBlocks[i],
        language,
      });
      if (audio) {
        params.onSceneProgress?.(i, scenes.length, `Sincronizando fala da cena ${i + 1}...`);
        sceneUrl = await muxVideoAudio({ apiKey: params.apiKey, videoUrl: clip.url, audioUrl: audio });
      }
    }

    clips.push(sceneUrl);
    params.onClipReady?.(i, sceneUrl);

    if (i < scenes.length - 1) {
      lastFrameUrl = params.image_url;
      try {
        const frame = await fal.subscribe("fal-ai/ffmpeg-api/extract-frame", {
          input: {
            video_url: clip.url,
            frame_type: "last",
          },
        });
        const fd = frame.data as { images?: { url: string }[]; image_url?: string; url?: string; image?: { url: string } };
        lastFrameUrl = fd.images?.[0]?.url ?? fd.image_url ?? fd.url ?? fd.image?.url ?? params.image_url;
      } catch {
        lastFrameUrl = params.image_url;
      }
      // eslint-disable-next-line no-console
      console.log(`[fal-client] cena ${i + 1} concluída. próxima usará referência:`, lastFrameUrl);
    }
  }

  params.onSceneProgress?.(scenes.length, scenes.length, "Unindo cenas...");

  // Áudio opcional
  let audioUrl: string | undefined;
  // Pula stable-audio se o modelo já gerou áudio nativo embutido nos clipes.
  if (!useNativeAudio && wantsAudio && (audioType === "music" || audioType === "both")) {
    try {
      const audioRes = await fal.subscribe("fal-ai/stable-audio", {
        input: {
          prompt: params.audioPrompt || `${params.prompt}, background music, ${params.style ?? "cinematic"}, no vocals`,
          seconds_total: params.totalDuration,
          steps: 100,
        },
      });
      const ad = audioRes.data as { audio_file?: { url: string } };
      audioUrl = ad.audio_file?.url;
    } catch {
      // segue sem áudio se falhar
    }
  }

  let merged_url = await mergeVideoClips(params.apiKey, clips, (msg) => params.onSceneProgress?.(scenes.length, scenes.length, msg));

  if (merged_url && audioUrl) {
    params.onSceneProgress?.(scenes.length, scenes.length, "Adicionando trilha musical ao vídeo final...");
    merged_url = await muxVideoAudio({ apiKey: params.apiKey, videoUrl: merged_url, audioUrl });
  }

  return { clips, merged_url };
}

// ── Overlays (texto/badge sobre vídeo) ──────────────────────────
export interface OverlayItem {
  id: string;
  type: "text" | "icon" | "badge";
  content: string;
  x: number;             // % da largura (0-100)
  y: number;             // % da altura (0-100)
  fontSize: number;      // px
  fontWeight: "normal" | "bold" | "black";
  color: string;
  bgColor: string;
  bgOpacity: number;     // 0-100
  bgRadius: number;
  padding: number;
  shadow: boolean;
  uppercase: boolean;
  width: "auto" | "full";
}

export const OVERLAY_PRESETS: Array<Omit<OverlayItem, "id" | "content" | "type"> & { name: string }> = [
  { name: "Título amarelo", color: "#000000", bgColor: "#FFE600", bgOpacity: 100, fontWeight: "black", uppercase: true, bgRadius: 8, width: "full", x: 0, y: 35, fontSize: 52, padding: 16, shadow: false },
  { name: "Badge verde CTA", color: "#FFFFFF", bgColor: "#00C853", bgOpacity: 100, fontWeight: "bold", uppercase: false, bgRadius: 30, width: "full", x: 0, y: 85, fontSize: 40, padding: 14, shadow: false },
  { name: "Legenda preta topo", color: "#FFFFFF", bgColor: "#000000", bgOpacity: 90, fontWeight: "bold", uppercase: true, bgRadius: 0, width: "full", x: 0, y: 5, fontSize: 44, padding: 12, shadow: false },
  { name: "Legenda preta base", color: "#FFFFFF", bgColor: "#000000", bgOpacity: 90, fontWeight: "bold", uppercase: true, bgRadius: 0, width: "full", x: 0, y: 90, fontSize: 44, padding: 12, shadow: false },
  { name: "Badge laranja destaque", color: "#FFFFFF", bgColor: "#FF6600", bgOpacity: 100, fontWeight: "black", uppercase: false, bgRadius: 12, width: "full", x: 0, y: 10, fontSize: 48, padding: 14, shadow: true },
];

export async function applyOverlaysToVideo(params: {
  apiKey: string;
  videoUrl: string;
  overlays: OverlayItem[];
}): Promise<string> {
  if (!params.overlays.length) return params.videoUrl;
  configureFal(params.apiKey);

  const filters = params.overlays.map((o) => {
    const text = (o.uppercase ? o.content.toUpperCase() : o.content)
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'");
    const x = o.width === "full" ? "(w-text_w)/2" : `(w*${o.x / 100})`;
    const y = `(h*${o.y / 100})`;
    const bgAlpha = (o.bgOpacity / 100).toFixed(2);
    const parts = [
      `drawtext=text='${text}'`,
      `fontsize=${o.fontSize}`,
      `fontcolor=${o.color}`,
      `box=1`,
      `boxcolor=${o.bgColor}@${bgAlpha}`,
      `boxborderw=${o.padding}`,
      `x=${x}`,
      `y=${y}`,
    ];
    if (o.shadow) parts.push(`shadowcolor=black@0.5`, `shadowx=2`, `shadowy=2`);
    return parts.join(":");
  }).join(",");

  try {
    const result = await fal.subscribe("fal-ai/ffmpeg-api", {
      input: {
        function: "apply_filter",
        input_url: params.videoUrl,
        vf_filter: filters,
        output_format: "mp4",
      },
    });
    const d = result.data as { output_url?: string; video_url?: string; url?: string };
    return d.output_url ?? d.video_url ?? d.url ?? params.videoUrl;
  } catch {
    return params.videoUrl;
  }
}

// ─────────────────────────────────────────────────────────────
// Pipeline sequencial baseado em VideoManifest
// ─────────────────────────────────────────────────────────────

export async function extractLastFrame(params: {
  apiKey: string;
  videoUrl: string;
  durationSeconds: number;
}): Promise<string | undefined> {
  configureFal(params.apiKey);
  try {
    const frame = await fal.subscribe("fal-ai/ffmpeg-api/extract-frame", {
      input: {
        video_url: params.videoUrl,
        frame_type: "last",
      },
    });
    const fd = frame.data as { images?: { url: string }[]; image_url?: string; url?: string; image?: { url: string } };
    return fd.images?.[0]?.url ?? fd.image_url ?? fd.url ?? fd.image?.url;
  } catch {
    return undefined;
  }
}

export async function generateSceneTTS(params: {
  apiKey: string;
  text: string;
  language: string;
  voice?: string;
}): Promise<string | undefined> {
  configureFal(params.apiKey);
  try {
    const res = await fal.subscribe("fal-ai/playai/tts/v3", {
      input: {
        input: params.text,
        voice: params.voice || "Jennifer (English (US)/American)",
        response_format: "url",
      },
    });
    const d = res.data as { audio?: { url: string }; audio_url?: string; url?: string };
    return d.audio?.url ?? d.audio_url ?? d.url;
  } catch {
    return undefined;
  }
}

export async function muxVideoAudio(params: {
  apiKey: string;
  videoUrl: string;
  audioUrl: string;
}): Promise<string> {
  configureFal(params.apiKey);
  try {
    const res = await fal.subscribe("fal-ai/ffmpeg-api/merge-audio-video", {
      input: {
        video_url: params.videoUrl,
        audio_url: params.audioUrl,
      },
    });
    const d = res.data as { video?: { url: string }; video_url?: string; output_url?: string; url?: string };
    return d.video?.url ?? d.video_url ?? d.output_url ?? d.url ?? params.videoUrl;
  } catch {
    return params.videoUrl;
  }
}

export interface GenerateFromManifestParams {
  apiKey: string;
  manifest: VideoManifest;
  modelConfig: VideoModel;
  quality?: VideoQuality;
  onSceneUpdate?: (scene: Scene) => void;
  onProgress?: (msg: string) => void;
}

async function runSingleScene(opts: GenerateFromManifestParams, idx: number, prevLastFrame: string | undefined) {
  const { manifest, modelConfig, quality = "standard", apiKey } = opts;
  const scene = manifest.scenes[idx];
  scene.previous_scene_last_frame = prevLastFrame ?? null;
  scene.video_prompt = assembleScenePrompt(scene, manifest.bible, idx, manifest.total_scenes);
  scene.status = "generating";
  opts.onSceneUpdate?.(scene);

  const v = validateSceneRuntime(manifest, idx);
  if (!v.ok) {
    scene.status = "error";
    scene.error = v.errors.join(" | ");
    opts.onSceneUpdate?.(scene);
    throw new Error(`Validação cena ${scene.order}: ${scene.error}`);
  }

  const modelId = resolveModelQuality(modelConfig.id, quality);
  const modelIdImg = resolveModelQuality(modelConfig.id_img, quality);
  const hasNativeAudio = (modelConfig as { has_native_audio?: boolean }).has_native_audio === true;
  const useNative = scene.audio_mode === "native" && hasNativeAudio;
  const refImage = prevLastFrame ?? manifest.character_ref_url ?? manifest.environment_ref_url ?? undefined;

  try {
    const clip = await generateClip({
      apiKey,
      modelId,
      modelIdImg,
      prompt: scene.video_prompt,
      aspect_ratio: manifest.bible.aspect_ratio,
      duration: scene.duration_seconds,
      image_url: refImage,
      seed: manifest.seed,
      withAudio: useNative,
      quality,
      modelResolution: (modelConfig as unknown as { resolution_param?: string }).resolution_param,
      onProgress: (m) => opts.onProgress?.(`Cena ${scene.order}/${manifest.total_scenes}: ${m}`),
    });
    scene.clip_url = clip.url;

    // TTS externo: gera áudio com o dialogue_chunk e muxa.
    if (scene.audio_mode === "tts_external") {
      opts.onProgress?.(`Cena ${scene.order}: gerando narração...`);
      const audio = await generateSceneTTS({
        apiKey,
        text: scene.dialogue_chunk,
        language: manifest.bible.language,
        voice: manifest.voice,
      });
      if (audio) {
        scene.audio_url = audio;
        opts.onProgress?.(`Cena ${scene.order}: sincronizando áudio...`);
        scene.final_url = await muxVideoAudio({ apiKey, videoUrl: clip.url, audioUrl: audio });
      } else {
        scene.final_url = clip.url;
      }
    } else {
      scene.final_url = clip.url;
    }

    // Extrai último frame para próxima cena (se houver).
    if (idx < manifest.total_scenes - 1) {
      opts.onProgress?.(`Cena ${scene.order}: extraindo frame final...`);
      scene.last_frame_url = await extractLastFrame({
        apiKey,
        videoUrl: scene.clip_url,
        durationSeconds: scene.duration_seconds,
      });
    }

    scene.status = "done";
    opts.onSceneUpdate?.(scene);
    return scene.last_frame_url;
  } catch (e) {
    scene.status = "error";
    scene.error = e instanceof Error ? e.message : String(e);
    opts.onSceneUpdate?.(scene);
    throw e;
  }
}

export async function generateFromManifest(opts: GenerateFromManifestParams): Promise<{
  clips: string[];
  merged_url: string | null;
  manifest: VideoManifest;
}> {
  const { manifest, apiKey } = opts;
  configureFal(apiKey);

  let prev: string | undefined = undefined;
  for (let i = 0; i < manifest.scenes.length; i++) {
    prev = await runSingleScene(opts, i, prev);
  }

  // Concat final em ordem.
  const finals = manifest.scenes.map((s) => s.final_url || s.clip_url).filter(Boolean) as string[];
  let merged_url: string | null = null;
  if (finals.length > 1) {
    opts.onProgress?.("Unindo cenas no vídeo final...");
    try {
      const res = await fal.subscribe("fal-ai/ffmpeg-api", {
        input: {
          function: "concat_videos",
          inputs: finals.map((url, i) => ({ type: "video", url, label: `c${i}` })),
          output_format: "mp4",
        },
      });
      const d = res.data as { video_url?: string; output_url?: string; url?: string };
      merged_url = d.video_url ?? d.output_url ?? d.url ?? null;
    } catch {
      merged_url = null;
    }
  } else {
    merged_url = finals[0] ?? null;
  }
  return { clips: finals, merged_url, manifest };
}

// Regera apenas uma cena, mantendo as outras. Usa o último frame da cena anterior.
export async function regenerateScene(opts: GenerateFromManifestParams, sceneIndex: number) {
  const prev = sceneIndex > 0 ? opts.manifest.scenes[sceneIndex - 1].last_frame_url : undefined;
  await runSingleScene(opts, sceneIndex, prev);
  return opts.manifest.scenes[sceneIndex];
}