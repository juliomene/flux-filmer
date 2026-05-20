## VideoForge AI v3 — escopo grande, vou alinhar antes de codar

Esse spec assume Next.js + Vercel API Routes, mas o projeto é **TanStack Start + Cloudflare Workers + Supabase já conectado**. Vou adaptar tudo pra essa stack sem perder funcionalidade. Antes de escrever código, preciso confirmar pontos chave porque o trabalho é grande (≈ 25 arquivos novos, 2 migrações, ~6h de geração + iteração).

## Adaptações da stack (obrigatórias)

- `/api/*` Vercel → `createServerFn` TanStack para tudo que o frontend chama; `/api/public/*` server routes só se precisar de webhook externo.
- `NEXT_PUBLIC_*` → vars já existentes (`VITE_SUPABASE_*`, `FAL_KEY` já está configurado).
- Provider único = **fal.ai** com chave `FAL_KEY` do servidor (já existe). O "campo de API key por provedor" do spec vira opcional — por padrão usa a chave do projeto.
- Multi-cena merge: `fal-ai/ffmpeg-api` (rodando no fal, não no Worker — Workers não rodam ffmpeg nativo).
- Realtime de progresso: polling via React Query (Workers + Supabase Realtime no client é ok, mas polling é mais simples e robusto pro caso).

## O que vou construir (faseado)

**Fase 1 — Base de dados e provedores**
- Migração SQL: `chat_conversations`, `chat_messages`, `video_projects`, `video_scenes` + RLS + buckets `chat-attachments`, `final-videos`, `audio-tracks`.
- Aproveitar `generated_images` e `generated_videos` existentes (adicionar colunas que faltam: `has_overlay`, `overlay_cfg`).
- `src/lib/providers/config.ts` com os 4 provedores fal.ai e seus modelos.

**Fase 2 — Server functions (fal.ai)**
- `chatGenerate` — roteador principal (image / video simples / multi-cena).
- `splitPrompt` — divide prompt em N cenas via Lovable AI Gateway (Gemini) — mais barato que GPT-4.
- `generateClip`, `mergeVideo`, `generateAudio`, `applyOverlay` (usa `fal-ai/ffmpeg-api`).
- `uploadAttachment` — upload pro bucket `chat-attachments`.

**Fase 3 — UI do chat (`/chat` e `/chat/$id`)**
- Layout 3 colunas: `ChatSidebar` + `ChatMessageList` + painel de config colapsável.
- `ChatInput` com textarea expansível, anexo (📎), galeria (🖼️), painel ⚙️ inline.
- `ChatMessage` com variantes: user, assistant-image, assistant-video, assistant-multi, loading, error.
- `OverlayEditor` reutilizável com preview ao vivo.
- `SceneProgress` durante geração multi-cena.
- Empty state com 4 sugestões clicáveis.

**Fase 4 — Integração com páginas existentes**
- `/images` ganha botão "Adicionar texto" → reusa `OverlayEditor`.
- `/videos` (já existe) ganha mesma feature.
- Sidebar do `AppShell` adiciona "Chat IA" como item principal.
- Index redireciona pra `/chat` quando logado (antes ia pra dashboard).

## Decisões que preciso confirmar

1. **Chave fal.ai**: usa a `FAL_KEY` já configurada no projeto (server-side) ou força cada usuário a colar a própria chave em `/settings`? Spec diz "apiKey do usuário no body", mas você já me deu `FAL_KEY` global. Recomendo: **usa a global por padrão, com opção de override por usuário** (mais simples de testar agora).

2. **Lovable AI Gateway pro `split-prompt`**: tudo bem usar Gemini 2.5 Flash via gateway (rápido, barato) em vez do Grok pra dividir cenas? Não preciso de API key adicional.

3. **Multi-provider real ou só fal.ai**: o spec lista xAI/Kling/Sora/Veo3, todos via fal.ai. Os 4 são modelos do fal.ai — uma única chave acessa tudo. Mas o arquivo atual `providers.ts` tem provedores nativos (OpenAI, Google, xAI direto). **Mantenho os dois caminhos** (fal.ai pro chat, providers nativos pras telas `/images` e `/videos` existentes) ou **migro tudo pra fal.ai**?

4. **Tamanho do PR**: prefere que eu entregue tudo de uma vez (~25 arquivos) ou divido em 2 entregas (fase 1+2 primeiro, depois 3+4)?

Me responde essas 4 e parto pra implementação.