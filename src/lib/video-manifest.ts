// Manifesto de vídeo + Bíblia de Continuidade.
// Toda a geração sequencial passa por aqui. Sem manifesto não há geração.

export interface ContinuityBible {
  character_lock: string;
  wardrobe_lock: string;
  environment_lock: string;
  camera_lock: string;
  lighting_lock: string;
  style_lock: string;
  voice_tone: string;
  language: string;
  aspect_ratio: string;
  continuity_rule: string;
}

export type SceneStatus = "pending" | "generating" | "done" | "error";

export interface Scene {
  scene_id: string;
  order: number;
  duration_seconds: number;
  start_time: string;
  end_time: string;
  reference_images: string[];
  previous_scene_last_frame: string | null;
  dialogue_chunk: string;
  visual_action: string;
  camera_action: string;
  emotion: string;
  video_prompt: string;
  negative_prompt: string;
  audio_mode: "tts_external" | "native" | "silent";
  status: SceneStatus;
  clip_url?: string;
  last_frame_url?: string;
  audio_url?: string;
  final_url?: string;
  error?: string;
}

export interface VideoManifest {
  video_id: string;
  title: string;
  total_duration: number;
  scene_duration: number;
  total_scenes: number;
  character_ref_url: string | null;
  environment_ref_url: string | null;
  bible: ContinuityBible;
  full_script: string;
  scenes: Scene[];
  global_negative: string;
  seed: number;
  audio_mode: "tts_external" | "native" | "silent";
  voice: string;
}

export const GLOBAL_NEGATIVE_PROMPT =
  "no character swap, no face change, no different person, no wardrobe change, no scene change, no environment change, no lighting change, no morphing, no flickering, no extra fingers, no deformed hands, no melting face, no deformed mouth, no duplicated speech, no garbled audio, no text on screen, no captions, no subtitles, no logo, no watermark, no AI artifacts";

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// Particiona um roteiro em N pedaços únicos por palavras (fallback determinístico
// se o LLM falhar). Garante chunks não vazios e diferentes entre si.
export function splitScriptByWords(script: string, n: number): string[] {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return Array.from({ length: n }, (_, i) => `Cena ${i + 1}`);
  const per = Math.max(1, Math.floor(words.length / n));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const start = i * per;
    const end = i === n - 1 ? words.length : (i + 1) * per;
    out.push(words.slice(start, end).join(" "));
  }
  // Se duplicados surgirem (texto curtíssimo), apenas anexa marcador.
  const seen = new Set<string>();
  return out.map((c, i) => {
    let v = c.trim() || `Parte ${i + 1}`;
    while (seen.has(v)) v = v + " …";
    seen.add(v);
    return v;
  });
}

// Builder local (fallback sem IA). Cria manifesto coerente a partir dos inputs.
export function buildLocalManifest(input: {
  title?: string;
  prompt: string;
  script: string;
  totalDuration: number;
  sceneDuration: number;
  language: string;
  voice: string;
  audioMode: VideoManifest["audio_mode"];
  characterRef: string | null;
  environmentRef: string | null;
  aspectRatio: string;
}): VideoManifest {
  const total_scenes = Math.max(1, Math.ceil(input.totalDuration / input.sceneDuration));
  const chunks = splitScriptByWords(input.script, total_scenes);
  const seed = Math.floor(Math.random() * 1_000_000);
  const bible: ContinuityBible = {
    character_lock:
      "Same character throughout: same face, same age, same body, same hair, same skin, same baseline expression. Never change identity. Match the reference image exactly.",
    wardrobe_lock:
      "Identical clothing in every scene: same garments, same colors, same fabric, no added or removed pieces.",
    environment_lock:
      "Same environment, same set, same props, same lighting in every scene. Do not change location unless the script explicitly requires it.",
    camera_lock: `Stable camera, aspect ratio ${input.aspectRatio}, no drastic angle changes, framing consistent across scenes.`,
    lighting_lock: "Identical lighting setup across scenes, same color temperature, same key light direction.",
    style_lock: "Photorealistic, natural skin, realistic motion, no AI look, no painting style.",
    voice_tone: `Natural ${input.language} speech, conversational rhythm, clear diction, no robotic voice.`,
    language: input.language,
    aspect_ratio: input.aspectRatio,
    continuity_rule: "Each scene is a direct continuation of the previous one. Never restart the story. Never repeat previous lines.",
  };

  const scenes: Scene[] = chunks.map((chunk, i) => {
    const start = i * input.sceneDuration;
    const end = Math.min(start + input.sceneDuration, input.totalDuration);
    return {
      scene_id: `scene_${String(i + 1).padStart(2, "0")}`,
      order: i + 1,
      duration_seconds: end - start,
      start_time: fmtTime(start),
      end_time: fmtTime(end),
      reference_images: [input.characterRef, input.environmentRef].filter(Boolean) as string[],
      previous_scene_last_frame: null,
      dialogue_chunk: chunk,
      visual_action: "Continue natural movement from previous scene.",
      camera_action: "Hold or gentle pan, no cut.",
      emotion: "Coerente com o roteiro nesta posição.",
      video_prompt: "", // preenchido em runtime
      negative_prompt: GLOBAL_NEGATIVE_PROMPT,
      audio_mode: input.audioMode,
      status: "pending",
    };
  });

  return {
    video_id: newId(),
    title: input.title || "Vídeo sequencial",
    total_duration: input.totalDuration,
    scene_duration: input.sceneDuration,
    total_scenes,
    character_ref_url: input.characterRef,
    environment_ref_url: input.environmentRef,
    bible,
    full_script: input.script,
    scenes,
    global_negative: GLOBAL_NEGATIVE_PROMPT,
    seed,
    audio_mode: input.audioMode,
    voice: input.voice,
  };
}

// Monta o prompt definitivo da cena (no momento da geração).
export function assembleScenePrompt(
  scene: Scene,
  bible: ContinuityBible,
  sceneIdx: number,
  total: number,
): string {
  const useNativeAudio = scene.audio_mode === "native";
  const speechLine = useNativeAudio
    ? `Speak ONLY the following line in ${bible.language}, lips synced exclusively to this text, do not invent or repeat any other line: "${scene.dialogue_chunk}"`
    : `(audio handled separately — generate video silent or with ambient sound only; do not lip-sync any other text)`;
  return [
    `Use the provided reference images 100%. This is scene ${sceneIdx + 1} of ${total} in a single sequential video — this is NOT a standalone clip.`,
    `Continuation of previous scene: keep the exact same character, same face, same wardrobe, same body, same hair, same environment, same lighting, same camera, and same visual style as the previous scenes.`,
    `CHARACTER LOCK: ${bible.character_lock}`,
    `WARDROBE LOCK: ${bible.wardrobe_lock}`,
    `ENVIRONMENT LOCK: ${bible.environment_lock}`,
    `CAMERA LOCK: ${bible.camera_lock}`,
    `LIGHTING LOCK: ${bible.lighting_lock}`,
    `STYLE: ${bible.style_lock}`,
    `CONTINUITY: ${bible.continuity_rule}`,
    `Action this scene: ${scene.visual_action}`,
    `Camera action: ${scene.camera_action}`,
    `Emotion: ${scene.emotion}`,
    `Dialogue rule: ${speechLine}`,
    `Aspect ratio ${bible.aspect_ratio}. Ultra-realistic. Smooth, natural, safe motion.`,
    `NEGATIVE: ${scene.negative_prompt}`,
  ].join("\n");
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateManifest(m: VideoManifest): ValidationResult {
  const errors: string[] = [];
  if (!m.scenes.length) errors.push("Manifesto sem cenas.");
  const ids = new Set<string>();
  const chunks = new Map<string, number>();
  m.scenes.forEach((s, i) => {
    if (!s.scene_id) errors.push(`Cena ${i + 1}: scene_id ausente.`);
    if (ids.has(s.scene_id)) errors.push(`scene_id duplicado: ${s.scene_id}`);
    ids.add(s.scene_id);
    const chunk = s.dialogue_chunk.trim();
    if (!chunk) errors.push(`Cena ${s.order}: dialogue_chunk vazio.`);
    if (chunk) {
      const prev = chunks.get(chunk);
      if (prev !== undefined) errors.push(`Cena ${s.order}: fala duplicada com cena ${prev}.`);
      chunks.set(chunk, s.order);
    }
    if (s.duration_seconds <= 0) errors.push(`Cena ${s.order}: duração inválida.`);
  });
  if (!m.bible.character_lock) errors.push("Bíblia: character_lock vazio.");
  return { ok: errors.length === 0, errors };
}

// Validação no momento de gerar uma cena específica (runtime).
export function validateSceneRuntime(m: VideoManifest, idx: number): ValidationResult {
  const errors: string[] = [];
  const s = m.scenes[idx];
  if (!s) return { ok: false, errors: [`Cena ${idx} inexistente.`] };
  if (idx > 0 && !s.previous_scene_last_frame && !m.character_ref_url) {
    errors.push(`Cena ${s.order}: sem frame da cena anterior nem referência principal.`);
  }
  if (!s.video_prompt.includes("scene")) errors.push(`Cena ${s.order}: prompt não declara posição "scene N of M".`);
  if (!s.video_prompt.includes("Continuation")) errors.push(`Cena ${s.order}: prompt não declara continuação.`);
  return { ok: errors.length === 0, errors };
}