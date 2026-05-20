// Client-safe: catálogo de provedores e tipos compartilhados entre UI e server.

export type MediaKind = "image" | "video";

export type ProviderId =
  | "openai"
  | "google"
  | "xai"
  | "anthropic"
  | "replicate"
  | "fal";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  supports: MediaKind[];
  defaultImageModel?: string;
  defaultVideoModel?: string;
  imageHint?: string;
  videoHint?: string;
  apiKeyHelp: string;
  apiKeyUrl?: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "openai",
    label: "OpenAI (ChatGPT / Sora)",
    supports: ["image", "video"],
    defaultImageModel: "gpt-image-1",
    defaultVideoModel: "sora-2",
    imageHint: "ex.: gpt-image-1",
    videoHint: "ex.: sora-2",
    apiKeyHelp: "Chave da OpenAI (sk-...)",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    label: "Google (Gemini / Veo)",
    supports: ["image", "video"],
    defaultImageModel: "gemini-2.5-flash-image",
    defaultVideoModel: "veo-3.0-generate-preview",
    imageHint: "ex.: gemini-2.5-flash-image (Nano Banana)",
    videoHint: "ex.: veo-3.0-generate-preview",
    apiKeyHelp: "API key do Google AI Studio",
    apiKeyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    supports: ["image"],
    defaultImageModel: "grok-2-image-1212",
    imageHint: "ex.: grok-2-image-1212",
    apiKeyHelp: "Chave da xAI (xai-...)",
    apiKeyUrl: "https://console.x.ai/",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    supports: [],
    apiKeyHelp: "Anthropic não tem geração de imagem/vídeo nativa hoje — disponível só para futuras integrações.",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "replicate",
    label: "Replicate",
    supports: ["image", "video"],
    imageHint: "ex.: black-forest-labs/flux-schnell",
    videoHint: "ex.: kwaivgi/kling-v2.1",
    apiKeyHelp: "Token da Replicate (r8_...)",
    apiKeyUrl: "https://replicate.com/account/api-tokens",
  },
  {
    id: "fal",
    label: "fal.ai",
    supports: ["image", "video"],
    defaultImageModel: "fal-ai/flux/schnell",
    defaultVideoModel: "fal-ai/kling-video/v1.6/standard/text-to-video",
    imageHint: "ex.: fal-ai/flux/schnell",
    videoHint: "ex.: fal-ai/kling-video/v1.6/standard/text-to-video",
    apiKeyHelp: "Chave da fal.ai",
    apiKeyUrl: "https://fal.ai/dashboard/keys",
  },
];

export function getProvider(id: ProviderId): ProviderDef {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Provider desconhecido: ${id}`);
  return p;
}

export function providersFor(kind: MediaKind): ProviderDef[] {
  return PROVIDERS.filter((p) => p.supports.includes(kind));
}