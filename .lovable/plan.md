## Plano de Atualização Completa

Escopo grande. Vou dividir em 4 entregas sequenciais para garantir que cada parte funcione antes de seguir. Confirme se quer tudo ou só algumas partes.

### Entrega 1 — Núcleo de geração (fal-client.ts)
- Reescrever `splitPromptIntoScenes` → `buildScenePrompts` com âncora visual forte (personagem, roupas, rosto, idioma).
- Reescrever `generateLongVideo`: sequencial, sempre image-to-video da cena 2 em diante usando último frame, seed fixo, suporte a `language`, `audioType` (none/music/speech/both), `style`, `referenceImageUrl`.
- Adicionar `uploadToFal(apiKey, file)` para subir referência uma vez só.
- Adicionar `applyOverlaysToVideo` via ffmpeg drawtext.

### Entrega 2 — Settings + Idioma + Áudio
- Adicionar ao store Zustand: `language`, `audioType`, `audioPrompt`, `audioLanguage`, `style`.
- Constante `LANGUAGES` exportada de `fal-client.ts`.
- Atualizar painel ⚙️ do chat (`_authenticated.chat.$id.tsx`) com dropdown de idioma, opções de áudio (Nenhum/Música/Fala/Ambos), aviso quando Kling + Fala.
- Atualizar `_authenticated.create.tsx` com os mesmos controles.

### Entrega 3 — OverlayBuilder
- Componente `src/components/app/OverlayBuilder.tsx`:
  - Preview ao vivo no aspect do vídeo
  - Elementos arrastáveis (drag por % de posição)
  - Painel de propriedades (cor, fundo, opacidade, raio, peso, maiúsculas, sombra, largura)
  - 5 presets (`OVERLAY_PRESETS`): Título amarelo, Badge verde, Legenda preta topo/base, Badge laranja
  - Botões: + Texto, + Badge, + Emoji, + Seta
- Toggle "Overlay" no painel ⚙️ e em `/create` que abre o builder em Drawer.
- Após gerar vídeo: se houver overlays, chamar `applyOverlaysToVideo` e mostrar resultado final.

### Entrega 4 — Otimização de upload de referência
- Em `InputImagePicker.tsx`: ao selecionar arquivo, fazer upload imediato via `fal.storage.upload`, guardar URL, e passar essa URL para `generateLongVideo` (sem re-upload por cena).
- Spinner de "Enviando referência..." durante upload.

### Detalhes técnicos
- `fal-ai/ffmpeg-api` substitui as chamadas antigas a `/extract-frame` e `/compose` (que estavam falhando).
- Frame extraction usa `function: "extract_frame"` + `timestamp: sceneDuration - 0.5`.
- Merge usa `function: "concat_videos"` com áudio opcional.
- Idioma é injetado em TODAS as cenas via âncora: `Language for any text or speech: ${language}`.
- Seed Kling fixo por projeto para consistência.

### Arquivos modificados
- `src/lib/fal-client.ts` (reescrita parcial)
- `src/stores/settings.ts` (novos campos)
- `src/components/app/OverlayBuilder.tsx` (novo)
- `src/components/app/InputImagePicker.tsx` (upload imediato)
- `src/routes/_authenticated.create.tsx` (UI nova)
- `src/routes/_authenticated.chat.$id.tsx` (painel ⚙️ atualizado)
- `src/lib/chat.functions.ts` (passar language/audioType para o backend se aplicável — porém geração é client-side, então pode só receber metadata)

Confirma para eu seguir com tudo, ou quer priorizar (ex.: só 1+2, deixar overlay para depois)?