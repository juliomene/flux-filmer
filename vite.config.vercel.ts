// Vercel-specific build config — used ONLY by `bun run build:vercel`.
// Uses Nitro, the official Vercel path for TanStack Start SSR/server functions.
// The Lovable preview continues to use vite.config.ts — nothing here affects it.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
  plugins: [nitro()],
});
