// Vercel-specific build config — used ONLY by `bun run build:vercel`.
// Disables the Cloudflare plugin so the TanStack Start build emits a
// Node/Vercel-compatible server bundle. The Lovable preview continues to
// use vite.config.ts (Cloudflare Workers) — nothing here affects it.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    target: "vercel",
    server: { entry: "server" },
  },
});
