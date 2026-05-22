# Deploy na Vercel

Este projeto roda em duas plataformas em paralelo:

- **Lovable preview** → usa `vite.config.ts` (Cloudflare Workers). Não mexa nele.
- **Vercel** → usa `vite.config.vercel.ts` + `vercel.json` (Node serverless).

## Passos

1. Conecte o repositório do GitHub na Vercel (botão **Add New → Project**).
2. A Vercel detecta automaticamente o `vercel.json` e roda `bun run build:vercel`.
3. Em **Project Settings → Environment Variables** adicione:

   | Nome | Onde encontrar |
   |------|----------------|
   | `SUPABASE_URL` | Painel Supabase → Settings → API |
   | `SUPABASE_PUBLISHABLE_KEY` | Painel Supabase → Settings → API (anon key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Settings → API (service role) |
   | `VITE_SUPABASE_URL` | mesmo valor de `SUPABASE_URL` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | mesmo valor de `SUPABASE_PUBLISHABLE_KEY` |
   | `VITE_SUPABASE_PROJECT_ID` | ref do projeto Supabase |
   | `FAL_KEY` | fal.ai → API Keys |
   | `LOVABLE_API_KEY` | painel do Lovable (Settings → Cloud → API Keys) |

4. Clique em **Deploy**.

## Como funciona

`vite.config.vercel.ts` desabilita o plugin Cloudflare do preset Lovable e
usa Nitro, o adaptador oficial do TanStack Start para a Vercel. Todo o código
de aplicação (rotas, server functions, Supabase, fal.ai) é reutilizado sem
alterações.

## Testar localmente

```bash
bun run build:vercel
# saída em .vercel/output/ pronta para a Vercel CLI:
npx vercel deploy --prebuilt
```
