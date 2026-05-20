## Mudanças solicitadas

1. **Sem página de vendas** — `/` redireciona para `/dashboard` (se logado) ou `/auth`.
2. **Sem créditos** — remover toda lógica de créditos da UI.
3. **Tracking de custo em USD** — cada imagem e vídeo registra `cost_usd`. Mostrar custo por item, total do projeto e total da conta.
4. **Geração real funcionando** — integração fal.ai via server functions (TanStack), upload pro Supabase Storage, polling assíncrono.

## Banco de dados (migração)

- `generated_images`: adicionar `cost_usd numeric(10,4)`, `status text` (pending/ready/failed), `error_message text`.
- `project_scenes`: adicionar `cost_usd numeric(10,4)`.
- `projects`: adicionar `total_cost_usd numeric(10,4) default 0`.
- `profiles`: manter coluna `credits` (sem mexer no schema pra não quebrar), mas UI ignora. Adicionar `total_spent_usd numeric(10,4) default 0` para o "gasto total da conta".
- Remover tabela `credit_transactions`? **Não** — manter, é histórico. Apenas não usar mais na UI.

## Server functions (fal.ai)

Arquivo `src/lib/generation.functions.ts` (client-safe path):

- `generateImage({ prompt })` → chama `https://fal.run/fal-ai/flux/schnell` (≈ $0.003/img), faz upload do resultado pro bucket `images/{user_id}/...`, insere em `generated_images` com `cost_usd`, retorna registro.
- `startVideoFromImage({ projectId, sceneId, imageUrl, prompt, duration })` → submete job em `fal-ai/kling-video/v1.6/standard/image-to-video` via `fal.queue.submit`, salva `request_id` em `project_scenes`, status `generating_clip`.
- `pollScene({ sceneId })` → checa status do job; quando pronto, baixa, sobe pro bucket `videos/`, atualiza `video_clip_url`, `cost_usd = 0.10 * duration_s`, status `ready`.
- `createProjectFromPrompt({ prompt, title })` → cria projeto, gera roteiro via Lovable AI Gateway dividindo em N cenas (10s cada), insere `project_scenes` com prompts visuais, retorna `projectId`.
- `composeProject({ projectId })` → quando todas cenas tiverem `video_clip_url`, monta lista de URLs (sem reencodar — concat client-side via `<video>` ou simplesmente disponibiliza playlist).

Custos hardcoded em `src/lib/costs.ts`:
```
flux/schnell: $0.003/imagem
kling v1.6 standard: $0.05/segundo (image-to-video 5s = $0.25, 10s = $0.50)
```

## UI

- **`/` (index)**: substituir por redirect (`beforeLoad`) → `/dashboard` ou `/auth`.
- **AppShell sidebar**: remover bloco de créditos; mostrar "Gasto total: $X.XX".
- **Dashboard**: cards "Projetos", "Em produção", "Gasto total (USD)". Sem "créditos".
- **`/create`**: wizard simples — título + prompt + nº de cenas → cria projeto, redireciona pra `/projects/$id`.
- **`/projects`**: lista projetos com status, custo total, thumbnail.
- **`/projects/$projectId`** (nova rota): mostra cenas, cada uma com imagem, vídeo (se pronto), prompt, status, **custo**. Botões: gerar imagem (Flux), animar (Kling), regerar. Polling via React Query `refetchInterval` enquanto algo está `generating_*`.
- **`/images`**: galeria de `generated_images` com prompt e custo por item.
- **`/settings`**: remover seção de créditos; mostrar "Gasto acumulado".

## Por que estava com "erro"

A geração ainda não existia — `/create`, `/projects`, `/images` eram placeholders. Vou implementar de verdade agora.

## Arquivos novos/editados

- migração SQL (custos + status)
- `src/lib/costs.ts`
- `src/lib/fal.server.ts` (cliente fal.ai com `FAL_KEY`)
- `src/lib/generation.functions.ts` (server fns: createProject, generateImage, startVideo, pollScene)
- `src/lib/storage.server.ts` (helper upload Supabase)
- `src/routes/index.tsx` (redirect)
- `src/routes/_authenticated.create.tsx` (wizard real)
- `src/routes/_authenticated.projects.tsx` (lista real)
- `src/routes/_authenticated.projects.$projectId.tsx` (detalhe + polling)
- `src/routes/_authenticated.images.tsx` (galeria real)
- `src/routes/_authenticated.dashboard.tsx` (trocar créditos por gasto)
- `src/routes/_authenticated.settings.tsx` (trocar créditos por gasto)
- `src/components/app/AppShell.tsx` (sidebar sem créditos)

Vou começar pela migração e em seguida implementar tudo.