// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Full Vercel build — Cloudflare plugin disabled and TanStack Start emits a
// Node/Vercel-compatible server bundle. The Lovable preview (Cloudflare Workers)
// will not run with this config; deploy on Vercel via `bun run build`.
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    target: "vercel",
    server: { entry: "server" },
  },
});
