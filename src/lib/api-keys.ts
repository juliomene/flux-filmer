// localStorage de chaves de API por provedor. Uso interno / pessoal — não sincroniza com servidor.
import { PROVIDERS, type ProviderId } from "./providers";

const STORAGE_KEY = "videoforge:api-keys:v1";

type Store = Partial<Record<ProviderId, string>>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getApiKey(provider: ProviderId): string {
  return read()[provider] ?? "";
}

export function setApiKey(provider: ProviderId, key: string) {
  const store = read();
  if (key) store[provider] = key;
  else delete store[provider];
  write(store);
}

export function getAllApiKeys(): Store {
  return read();
}

export function hasAnyKey(): boolean {
  return Object.values(read()).some(Boolean);
}

export const ALL_PROVIDERS = PROVIDERS;