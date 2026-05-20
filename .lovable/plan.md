# VideoForge AI — Plano de Construção

SaaS de geração de vídeos longos com IA. Stack adaptada: **TanStack Start + Supabase + fal.ai** (em vez de Next.js/Vercel, conforme já alinhado), com server functions no Cloudflare Workers via Lovable.

## Fase 1 — Fundação (esta etapa)

1. **Banco de dados (Supabase migration)**
   - `profiles` (display_name, avatar_url, credits=100 default) com trigger `on_auth_user_created`
   - `projects` (user_id, title, prompt, status, video_url, duration_s, thumbnail_url)
   - `project_scenes` (project_id, index, prompt, image_url, video_clip_url, status)
   - `generated_images` (user_id, prompt, image_url, model)
   - `credit_transactions` (user_id, delta, reason, project_id)
   - RLS: usuário só vê os próprios registros em todas as tabelas
   - Storage buckets: `images` (público), `videos` (público), `thumbnails` (público)

2. **Auth**
   - Página `/auth` (login + signup email/senha) com `emailRedirectTo`
   - `_authenticated` layout route que redireciona para `/auth` se sem sessão
   - `onAuthStateChange` no root + invalidate queries
   - Componente `<UserMenu>` com logout

3. **Layout & Design System**
   - Tema escuro premium (preto/roxo neon estilo Runway/Sora)
   - Tokens em `src/styles.css` (oklch): primary roxo neon, gradientes, glow
   - Shell com sidebar (Dashboard, Criar, Projetos, Imagens, Configurações)
   - Mobile-first, sidebar vira drawer < 768px

## Fase 2 — Páginas principais

4. **Landing `/`** — hero, features, pricing, CTA
5. **Dashboard `/dashboard`** — créditos, últimos projetos, ações rápidas, seed de 3 mock se vazio
6. **`/create`** — wizard: prompt → roteiro/cenas → imagens → vídeo (preview com React Query polling)
7. **`/projects`** — grid com filtro por status, player inline, download .mp4
8. **`/images`** — galeria de imagens geradas, reusar em projeto
9. **`/settings`** — perfil, créditos, histórico de transações

## Fase 3 — Backend (server functions)

10. **fal.ai integration** — secret `FAL_KEY`, helper server-only
11. Server functions:
    - `generateScript` (LLM via Lovable AI Gateway → quebra prompt em cenas)
    - `generateImage` (fal.ai flux) → upload pro bucket → cria row
    - `generateClip` (fal.ai kling/luma 10s por cena) → upload
    - `composeVideo` (concatena clipes + áudio via fal.ai)
    - `getProject`, `listProjects`, `deductCredits`
12. Polling de status via React Query

## Detalhes técnicos

- TanStack Start file-based routes em `src/routes/`
- `createServerFn` + `requireSupabaseAuth` para tudo que é user-scoped
- `supabaseAdmin` apenas em webhooks/operações privilegiadas
- Sem Edge Functions Supabase (usar server fns)
- React Query para cache; toda UI em pt-BR
- shadcn/ui já disponível

## Esta resposta entrega

**Apenas a Fase 1** (banco + auth + shell de layout + tema). Páginas e geração de vídeo virão nas próximas iterações para manter o escopo gerenciável e evitar bugs em cascata.

Aprova esse caminho? Posso começar pela migração do banco assim que confirmar.
