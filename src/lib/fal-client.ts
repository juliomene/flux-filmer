import { fal } from "@fal-ai/client";

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
  { id: "xai/grok-imagine-video/text-to-video", id_img: "xai/grok-imagine-video/image-to-video", name: "Grok Imagine Video", provider: "xAI", quality: "720p", speed: "Normal", cost_per_5s: 0.25, cost_per_10s: 0.50, max_duration: 10, has_native_audio: true, note: "Áudio nativo" },
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

export function buildScenePrompts(params: {
  userPrompt: string;
  totalScenes: number;
  language: string;
  style?: string;
}): string[] {
  const { userPrompt, totalScenes, language, style = "cinematic" } = params;

  // Âncora visual obrigatória em TODAS as cenas — garante personagem, roupas,
  // rosto, paleta e iluminação consistentes do início ao fim.
  const visualAnchor = [
    `IMPORTANT: Keep exact same character appearance, same face, same clothes, same hair throughout all scenes.`,
    `Same lighting style. Same color grading. Same ${style} camera style.`,
    `DO NOT change the character. DO NOT change the setting unless the story requires it.`,
    `LANGUAGE RULE: The user prompt may be written in any language, but ALL spoken dialogue, voiceover, narration, captions, signs, and on-screen text in the final video MUST be translated to and rendered exclusively in ${language}. Do not mix languages. Translate any quoted dialogue from the prompt into natural, native-sounding ${language}, preserving meaning, tone and intent.`,
  ].join(" ");

  if (totalScenes === 1) return [`${visualAnchor} ${userPrompt}`];

  const beats = [
    "Opening shot, establishing the scene",
    "Continuing action, same character",
    "Middle of the story, same character progressing",
    "Climax moment, same character",
    "Closing shot, same character, resolution",
  ];

  return Array.from({ length: totalScenes }, (_, i) => {
    const beat = beats[Math.min(i, beats.length - 1)];
    return `${visualAnchor} Scene ${i + 1}/${totalScenes}: ${beat}. Story: ${userPrompt}`;
  });
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
  const quality = params.quality ?? "standard";
  const seed = params.projectSeed ?? Math.floor(Math.random() * 100000);
  const modelId = resolveModelQuality(params.modelConfig.id, quality);
  const modelIdImg = resolveModelQuality(params.modelConfig.id_img, quality);
  const hasNativeAudio = (params.modelConfig as { has_native_audio?: boolean }).has_native_audio === true;
  const wantsAudio = audioType !== "none";
  const useNativeAudio = hasNativeAudio && wantsAudio;

  const clips: string[] = [];
  // Sequencial para encadear o último frame de cada cena como referência da próxima.
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
      onProgress: (msg) => params.onSceneProgress?.(i, scenes.length, msg),
    });
    clips.push(clip.url);
    params.onClipReady?.(i, clip.url);

    // Extrai último frame para continuidade visual da próxima cena
    if (i < scenes.length - 1) {
      try {
        const frame = await fal.subscribe("fal-ai/ffmpeg-api", {
          input: {
            function: "extract_frame",
            input_url: clip.url,
            timestamp: Math.max(0, params.sceneDuration - 0.5),
          },
        });
        const fd = frame.data as { image_url?: string; url?: string; image?: { url: string } };
        lastFrameUrl = fd.image_url ?? fd.url ?? fd.image?.url ?? lastFrameUrl;
      } catch {
        // mantém referência anterior se falhar
      }
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

  let merged_url: string | null = null;
  if (clips.length > 1) {
    try {
      const mergeInput: Record<string, unknown> = {
        function: "concat_videos",
        inputs: clips.map((url, i) => ({ type: "video", url, label: `c${i}` })),
        output_format: "mp4",
      };
      if (audioUrl) mergeInput.audio_url = audioUrl;
      const mergeResult = await fal.subscribe("fal-ai/ffmpeg-api", { input: mergeInput });
      const data = mergeResult.data as { video_url?: string; output_url?: string; url?: string };
      merged_url = data.video_url ?? data.output_url ?? data.url ?? clips[clips.length - 1];
    } catch {
      merged_url = clips[clips.length - 1];
    }
  } else {
    merged_url = clips[0] ?? null;
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