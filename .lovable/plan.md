# Pipeline de Vídeo Sequencial com Continuidade Real

## Objetivo
Resolver: cenas atuais não mantêm personagem/cenário/fala. Cada cena vira "vídeo independente". Falas se repetem. Sem cronologia.

Reescrever o núcleo de geração (`fal-client.ts`) introduzindo **Video Manifest + Continuity Bible + dialogue chunks únicos + geração sequencial com last-frame**, e adicionar uma UI de revisão de cenas antes de gerar.

---

## 1. Camada de dados (novo módulo `src/lib/video-manifest.ts`)

Tipos centrais:

```ts
ContinuityBible {
  character_lock, wardrobe_lock, environment_lock,
  camera_lock, lighting_lock, style_lock,
  voice_tone, language, aspect_ratio, continuity_rule
}

Scene {
  scene_id, order, duration_seconds, start_time, end_time,
  reference_images[], previous_scene_last_frame,
  dialogue_chunk, visual_action, camera_action, emotion,
  video_prompt, negative_prompt, audio_mode,
  status: pending|generating|done|error,
  clip_url?, last_frame_url?, audio_url?, error?
}

VideoManifest {
  video_id, title, total_duration, scene_duration, total_scenes,
  character_ref_url, environment_ref_url,
  bible: ContinuityBible,
  full_script, scenes: Scene[],
  global_negative, seed
}
```

Funções:
- `buildManifest(input)` — usa Lovable AI Gateway (Gemini) para:
  1. Extrair `ContinuityBible` do prompt + imagens.
  2. Dividir o roteiro completo em N `dialogue_chunk` (um por cena, **únicos**, não sobrepostos).
  3. Para cada cena gerar `visual_action`, `camera_action`, `emotion`.
- `assembleScenePrompt(scene, bible, sceneIdx, total)` — monta o prompt base fornecido pelo usuário, injetando bible + chunk + ação + "esta é cena N de M, continuação direta da anterior".
- `validateManifest(m)` — bloqueia geração se:
  - algum `dialogue_chunk` duplicado/vazio
  - número de cenas ≠ falas
  - cena ≥2 sem `previous_scene_last_frame` no momento da geração
  - bible vazia

Constante `GLOBAL_NEGATIVE_PROMPT` com a lista anti-bug (troca de rosto, dedos, morphing, legenda, etc.).

## 2. Geração sequencial (refatorar `generateLongVideo` em `fal-client.ts`)

Nova função `generateFromManifest(manifest, { apiKey, model, onProgress, onSceneDone })`:

```
for i in 0..N-1:
  scene = manifest.scenes[i]
  if i>0: scene.previous_scene_last_frame = prevLastFrame
  scene.video_prompt = assembleScenePrompt(...)
  validateScene(scene)            // hard fail se inválido
  clip = await generateClip({
    image_url: prevLastFrame ?? characterRef,
    prompt: scene.video_prompt,
    duration: scene.duration_seconds,
    seed: manifest.seed,           // fixo no projeto
    aspect_ratio: bible.aspect_ratio,
    withAudio: audioMode === 'native',
  })
  scene.clip_url = clip.url
  prevLastFrame = await extractLastFrame(clip.url, scene.duration_seconds - 0.3)
  scene.last_frame_url = prevLastFrame
  scene.status = 'done'
  onSceneDone(scene)
```

Sequencial obrigatório (sem `Promise.all`).

`regenerateScene(manifest, sceneIndex)` — regera **apenas** uma cena reutilizando `last_frame` da cena anterior e mantém as demais.

## 3. Áudio — TTS externo vs nativo

Adicionar:
- `audioMode: 'tts_external' | 'native'` no manifest (default `tts_external`).
- `generateSceneTTS(scene, voice)` chamando `fal-ai/playai/tts/v3` (ou `fal-ai/elevenlabs/tts`) com o `dialogue_chunk` exato. Prompt de voz BR natural.
- Função `mergeSceneWithAudio(clip_url, audio_url)` via `fal-ai/ffmpeg-api` `mux_audio` (substituindo trilha original).
- Merge final: `concat_videos` na ordem `scene_01..N`, áudio já embutido por cena.

## 4. Persistência (Supabase)

Migration nova — adicionar colunas em `chat_video_projects` e `chat_video_scenes`:
- `chat_video_projects.manifest jsonb`, `continuity_bible jsonb`, `final_script text`, `audio_mode text default 'tts_external'`, `seed integer`
- `chat_video_scenes.dialogue_chunk text`, `visual_action text`, `emotion text`, `last_frame_url text`, `audio_url text`, `video_prompt text`

(RLS atual já cobre via project_id → user.)

## 5. UI — nova rota `/create-sequential` (ou aba na `/create`)

Tela única com 3 passos visíveis:

**Passo 1 — Inputs**
- upload imagem do personagem
- upload imagem do ambiente (opcional)
- textarea roteiro completo
- duração total (slider 10–60s)
- duração por cena (5/8/10)
- idioma (default pt-BR), voz (M/F)
- modo áudio (TTS externo / nativo)
- botão **Gerar Manifesto**

**Passo 2 — Revisão de cenas** (após manifest)
- card por cena: número, duração, `dialogue_chunk` editável, `visual_action` editável, prompt gerado (expandable), status
- validação visual de chunks duplicados (badge vermelho)
- botão **Gerar Vídeo Sequencial**

**Passo 3 — Resultado**
- progresso por cena (1/N… N/N)
- preview de cada cena conforme conclui (`onSceneDone`)
- botão **Regerar Cena X** por card
- ao final: player do vídeo unido + downloads (vídeo final, cenas, manifesto JSON, áudios)

## 6. Validações duras (bloqueiam envio à fal.ai)
- manifest existe
- todos `scene_id` únicos
- todos `dialogue_chunk` únicos e não-vazios
- cena ≥2 com `previous_scene_last_frame` setado em runtime
- prompt contém "scene N of M" + "continuation of previous scene" + character_lock
- seed do projeto fixa para todas as cenas

---

## Arquivos
- **novo** `src/lib/video-manifest.ts` (tipos, builder, validador, prompt assembler)
- **edit** `src/lib/fal-client.ts` (substituir `buildScenePrompts`/`generateLongVideo`, adicionar `generateFromManifest`, `regenerateScene`, `extractLastFrame`, TTS helpers, mux)
- **novo** `src/routes/_authenticated.sequential.tsx` (UI 3 passos)
- **edit** `src/components/app/AppShell.tsx` (link de nav "Vídeo Sequencial")
- **migration** colunas extras em `chat_video_projects` e `chat_video_scenes`

## Out of scope (não nesta entrega)
- Reordenação drag-and-drop de cenas
- Editor de timeline visual
- Multi-personagem com bíblias separadas
