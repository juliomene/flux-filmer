// Server-only: implementação por provedor para geração de imagens/vídeos.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ProviderId } from "./providers";

export interface GenerateImageInput {
  provider: ProviderId;
  model: string;
  apiKey: string;
  prompt: string;
  inputImageUrl?: string; // se presente: edição/img2img
}

export interface GenerateVideoStartInput {
  provider: ProviderId;
  model: string;
  apiKey: string;
  prompt: string;
  inputImageUrl?: string;
  durationSeconds?: number;
}

export type ImageResult = { kind: "image"; url: string };
export type VideoStartResult = { externalId: string; raw?: unknown };
export type VideoPollResult =
  | { status: "processing" }
  | { status: "ready"; url: string }
  | { status: "failed"; error: string };

async function fetchAsBuffer(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${url} ${r.status}`);
  return {
    data: await r.arrayBuffer(),
    contentType: r.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function uploadBuffer(
  bucket: "images" | "videos",
  userId: string,
  data: ArrayBuffer,
  contentType: string,
  ext: string,
) {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, data, { contentType, upsert: false });
  if (error) throw new Error(`upload ${bucket}: ${error.message}`);
  return supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function ensureKey(apiKey: string, provider: ProviderId) {
  if (!apiKey || apiKey.length < 8) throw new Error(`Informe sua API key do provedor ${provider}.`);
}

// ───────────── IMAGES ─────────────

export async function generateImage(
  input: GenerateImageInput,
  userId: string,
): Promise<ImageResult> {
  ensureKey(input.apiKey, input.provider);

  switch (input.provider) {
    case "openai":
    case "xai":
      return openAICompatibleImage(input, userId);
    case "google":
      return googleGeminiImage(input, userId);
    case "fal":
      return falImage(input, userId);
    case "replicate":
      return replicateImage(input, userId);
    default:
      throw new Error(`Provedor ${input.provider} não suporta geração de imagem.`);
  }
}

async function openAICompatibleImage(input: GenerateImageInput, userId: string): Promise<ImageResult> {
  const base = input.provider === "xai" ? "https://api.x.ai/v1" : "https://api.openai.com/v1";
  let res: Response;
  if (input.inputImageUrl && input.provider === "openai") {
    // edit endpoint requires multipart
    const img = await fetchAsBuffer(input.inputImageUrl);
    const form = new FormData();
    form.append("model", input.model);
    form.append("prompt", input.prompt);
    form.append("image", new Blob([img.data], { type: img.contentType }), "input.png");
    res = await fetch(`${base}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}` },
      body: form,
    });
  } else {
    res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: input.model, prompt: input.prompt, n: 1 }),
    });
  }
  if (!res.ok) throw new Error(`${input.provider} image ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as { data: Array<{ url?: string; b64_json?: string }> };
  const item = data.data?.[0];
  let buf: ArrayBuffer, ct: string;
  if (item?.b64_json) {
    buf = Uint8Array.from(atob(item.b64_json), (c) => c.charCodeAt(0)).buffer;
    ct = "image/png";
  } else if (item?.url) {
    const dl = await fetchAsBuffer(item.url);
    buf = dl.data;
    ct = dl.contentType;
  } else throw new Error("Resposta sem imagem.");
  const url = await uploadBuffer("images", userId, buf, ct, ct.includes("png") ? "png" : "jpg");
  return { kind: "image", url };
}

async function googleGeminiImage(input: GenerateImageInput, userId: string): Promise<ImageResult> {
  const parts: unknown[] = [{ text: input.prompt }];
  if (input.inputImageUrl) {
    const img = await fetchAsBuffer(input.inputImageUrl);
    parts.push({
      inlineData: {
        mimeType: img.contentType,
        data: btoa(String.fromCharCode(...new Uint8Array(img.data))),
      },
    });
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": input.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    },
  );
  if (!res.ok) throw new Error(`google image ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }>;
  };
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData) throw new Error("Gemini não retornou imagem.");
  const buf = Uint8Array.from(atob(part.inlineData.data), (c) => c.charCodeAt(0)).buffer;
  const url = await uploadBuffer("images", userId, buf, part.inlineData.mimeType, "png");
  return { kind: "image", url };
}

async function falImage(input: GenerateImageInput, userId: string): Promise<ImageResult> {
  const body: Record<string, unknown> = { prompt: input.prompt };
  if (input.inputImageUrl) body.image_url = input.inputImageUrl;
  const res = await fetch(`https://fal.run/${input.model}`, {
    method: "POST",
    headers: { Authorization: `Key ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`fal image ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as { images?: Array<{ url: string }>; image?: { url: string } };
  const remote = data.images?.[0]?.url ?? data.image?.url;
  if (!remote) throw new Error("fal não retornou imagem.");
  const dl = await fetchAsBuffer(remote);
  const url = await uploadBuffer("images", userId, dl.data, dl.contentType, "jpg");
  return { kind: "image", url };
}

async function replicateImage(input: GenerateImageInput, userId: string): Promise<ImageResult> {
  const start = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      model: input.model,
      input: input.inputImageUrl
        ? { prompt: input.prompt, image: input.inputImageUrl }
        : { prompt: input.prompt },
    }),
  });
  if (!start.ok) throw new Error(`replicate ${start.status}: ${(await start.text()).slice(0, 400)}`);
  let pred = (await start.json()) as { id: string; status: string; output?: unknown; error?: string };
  while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled") {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${input.apiKey}` },
    });
    pred = (await r.json()) as typeof pred;
  }
  if (pred.status !== "succeeded") throw new Error(pred.error ?? "Replicate falhou");
  const out = pred.output;
  const remote = Array.isArray(out) ? String(out[0]) : typeof out === "string" ? out : null;
  if (!remote) throw new Error("Replicate sem saída de imagem");
  const dl = await fetchAsBuffer(remote);
  const url = await uploadBuffer("images", userId, dl.data, dl.contentType, "png");
  return { kind: "image", url };
}

// ───────────── VIDEOS ─────────────

export async function startVideo(input: GenerateVideoStartInput): Promise<VideoStartResult> {
  ensureKey(input.apiKey, input.provider);
  switch (input.provider) {
    case "openai":
      return startOpenAIVideo(input);
    case "google":
      return startGoogleVeo(input);
    case "fal":
      return startFalVideo(input);
    case "replicate":
      return startReplicateVideo(input);
    default:
      throw new Error(`Provedor ${input.provider} não suporta vídeo.`);
  }
}

export async function pollVideo(
  provider: ProviderId,
  model: string,
  apiKey: string,
  externalId: string,
  userId: string,
): Promise<VideoPollResult> {
  switch (provider) {
    case "openai":
      return pollOpenAIVideo(model, apiKey, externalId, userId);
    case "google":
      return pollGoogleVeo(model, apiKey, externalId, userId);
    case "fal":
      return pollFalVideo(model, apiKey, externalId, userId);
    case "replicate":
      return pollReplicateVideo(apiKey, externalId, userId);
    default:
      throw new Error(`Provedor ${provider} não suporta vídeo.`);
  }
}

async function startOpenAIVideo(input: GenerateVideoStartInput): Promise<VideoStartResult> {
  const body: Record<string, unknown> = { model: input.model, prompt: input.prompt };
  if (input.durationSeconds) body.seconds = String(input.durationSeconds);
  const res = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`sora start ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as { id: string };
  return { externalId: data.id };
}

async function pollOpenAIVideo(_model: string, apiKey: string, id: string, userId: string): Promise<VideoPollResult> {
  const r = await fetch(`https://api.openai.com/v1/videos/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) return { status: "failed", error: `sora status ${r.status}` };
  const data = (await r.json()) as { status: string; error?: { message: string } };
  if (data.status === "failed") return { status: "failed", error: data.error?.message ?? "sora failed" };
  if (data.status !== "completed") return { status: "processing" };
  const dl = await fetch(`https://api.openai.com/v1/videos/${id}/content`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!dl.ok) return { status: "failed", error: `sora download ${dl.status}` };
  const buf = await dl.arrayBuffer();
  const url = await uploadBuffer("videos", userId, buf, "video/mp4", "mp4");
  return { status: "ready", url };
}

async function startGoogleVeo(input: GenerateVideoStartInput): Promise<VideoStartResult> {
  const instances: Record<string, unknown> = { prompt: input.prompt };
  if (input.inputImageUrl) {
    const img = await fetchAsBuffer(input.inputImageUrl);
    instances.image = {
      bytesBase64Encoded: btoa(String.fromCharCode(...new Uint8Array(img.data))),
      mimeType: img.contentType,
    };
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:predictLongRunning`,
    {
      method: "POST",
      headers: { "x-goog-api-key": input.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [instances] }),
    },
  );
  if (!res.ok) throw new Error(`veo start ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as { name: string };
  return { externalId: data.name };
}

async function pollGoogleVeo(_model: string, apiKey: string, opName: string, userId: string): Promise<VideoPollResult> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${opName}`, {
    headers: { "x-goog-api-key": apiKey },
  });
  if (!r.ok) return { status: "failed", error: `veo status ${r.status}` };
  const data = (await r.json()) as {
    done?: boolean;
    error?: { message: string };
    response?: {
      generateVideoResponse?: {
        generatedSamples?: Array<{ video?: { uri?: string } }>;
      };
    };
  };
  if (!data.done) return { status: "processing" };
  if (data.error) return { status: "failed", error: data.error.message };
  const uri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) return { status: "failed", error: "veo: resposta sem vídeo" };
  const dl = await fetch(`${uri}${uri.includes("?") ? "&" : "?"}key=${apiKey}`);
  if (!dl.ok) return { status: "failed", error: `veo download ${dl.status}` };
  const buf = await dl.arrayBuffer();
  const url = await uploadBuffer("videos", userId, buf, "video/mp4", "mp4");
  return { status: "ready", url };
}

async function startFalVideo(input: GenerateVideoStartInput): Promise<VideoStartResult> {
  const body: Record<string, unknown> = { prompt: input.prompt };
  if (input.inputImageUrl) body.image_url = input.inputImageUrl;
  if (input.durationSeconds) body.duration = String(input.durationSeconds);
  const res = await fetch(`https://queue.fal.run/${input.model}`, {
    method: "POST",
    headers: { Authorization: `Key ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`fal video start ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as { request_id: string };
  return { externalId: data.request_id };
}

async function pollFalVideo(model: string, apiKey: string, id: string, userId: string): Promise<VideoPollResult> {
  const st = await fetch(`https://queue.fal.run/${model}/requests/${id}/status`, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  if (!st.ok) return { status: "failed", error: `fal status ${st.status}` };
  const s = (await st.json()) as { status: string };
  if (s.status === "FAILED") return { status: "failed", error: "fal failed" };
  if (s.status !== "COMPLETED") return { status: "processing" };
  const r = await fetch(`https://queue.fal.run/${model}/requests/${id}`, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  const data = (await r.json()) as { video?: { url: string }; output?: { video?: { url: string } } };
  const remote = data.video?.url ?? data.output?.video?.url;
  if (!remote) return { status: "failed", error: "fal sem vídeo" };
  const dl = await fetchAsBuffer(remote);
  const url = await uploadBuffer("videos", userId, dl.data, dl.contentType, "mp4");
  return { status: "ready", url };
}

async function startReplicateVideo(input: GenerateVideoStartInput): Promise<VideoStartResult> {
  const inp: Record<string, unknown> = { prompt: input.prompt };
  if (input.inputImageUrl) inp.image = input.inputImageUrl;
  if (input.durationSeconds) inp.duration = input.durationSeconds;
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: input.model, input: inp }),
  });
  if (!res.ok) throw new Error(`replicate video ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as { id: string };
  return { externalId: data.id };
}

async function pollReplicateVideo(apiKey: string, id: string, userId: string): Promise<VideoPollResult> {
  const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) return { status: "failed", error: `replicate ${r.status}` };
  const data = (await r.json()) as { status: string; output?: unknown; error?: string };
  if (data.status === "failed" || data.status === "canceled") {
    return { status: "failed", error: data.error ?? "replicate failed" };
  }
  if (data.status !== "succeeded") return { status: "processing" };
  const out = data.output;
  const remote = Array.isArray(out) ? String(out[0]) : typeof out === "string" ? out : null;
  if (!remote) return { status: "failed", error: "replicate sem vídeo" };
  const dl = await fetchAsBuffer(remote);
  const url = await uploadBuffer("videos", userId, dl.data, dl.contentType, "mp4");
  return { status: "ready", url };
}