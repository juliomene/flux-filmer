import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Eye, EyeOff, Download, RefreshCw, CheckCircle2, AlertTriangle, Film, Layers, Settings2 } from "lucide-react";
import { InputImagePicker } from "@/components/app/InputImagePicker";
import { useSettings } from "@/stores/settings";
import {
  VIDEO_MODELS,
  ratioToAspect,
  ALL_LANGUAGES,
  generateFromManifest,
  regenerateScene,
} from "@/lib/fal-client";
import {
  buildLocalManifest,
  validateManifest,
  type VideoManifest,
  type Scene,
} from "@/lib/video-manifest";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sequential")({
  head: () => ({ meta: [{ title: "Vídeo Sequencial — Forge" }] }),
  component: SequentialPage,
});

function SequentialPage() {
  const { falApiKey, setFalApiKey, selectedFormat, setSelectedFormat, language, setLanguage } = useSettings();

  // Step 1
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [characterRef, setCharacterRef] = useState("");
  const [environmentRef, setEnvironmentRef] = useState("");
  const [totalDuration, setTotalDuration] = useState(30);
  const [sceneDuration, setSceneDuration] = useState<5 | 8 | 10>(5);
  const [audioMode, setAudioMode] = useState<"tts_external" | "native" | "silent">("tts_external");
  const [voice, setVoice] = useState("Jennifer (English (US)/American)");
  const [modelKey, setModelKey] = useState("fal-ai/kling-video/v1.6/standard/text-to-video__480p");
  const [showKey, setShowKey] = useState(false);

  // Step 2/3
  const [manifest, setManifest] = useState<VideoManifest | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyScene, setBusyScene] = useState<number | null>(null);
  const [progress, setProgress] = useState("");
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);

  const model = useMemo(
    () => VIDEO_MODELS.find((m) => `${m.id}__${m.quality}` === modelKey) ?? VIDEO_MODELS[0],
    [modelKey],
  );
  const aspect = ratioToAspect(selectedFormat);

  const validation = manifest ? validateManifest(manifest) : null;

  const buildManifest = () => {
    if (!prompt.trim() || !script.trim()) {
      toast.error("Preencha prompt e roteiro completo.");
      return;
    }
    const m = buildLocalManifest({
      title: title || prompt.slice(0, 60),
      prompt,
      script,
      totalDuration,
      sceneDuration,
      language,
      voice,
      audioMode,
      characterRef: characterRef || null,
      environmentRef: environmentRef || null,
      aspectRatio: aspect,
    });
    setManifest(m);
    setMergedUrl(null);
    toast.success(`Manifesto criado com ${m.total_scenes} cenas.`);
  };

  const updateScene = (idx: number, patch: Partial<Scene>) => {
    setManifest((m) => {
      if (!m) return m;
      const next = { ...m, scenes: m.scenes.map((s, i) => (i === idx ? { ...s, ...patch } : s)) };
      return next;
    });
  };

  const generateAll = async () => {
    if (!manifest) return;
    if (!falApiKey) return toast.error("Configure sua fal.ai API key.");
    const v = validateManifest(manifest);
    if (!v.ok) return toast.error(v.errors[0]);
    setGenerating(true);
    setMergedUrl(null);
    try {
      const res = await generateFromManifest({
        apiKey: falApiKey,
        manifest,
        modelConfig: model,
        quality: model.quality?.includes("1080") || model.quality === "720p" ? "pro" : "standard",
        onProgress: setProgress,
        onSceneUpdate: (s) => updateScene(s.order - 1, s),
      });
      setMergedUrl(res.merged_url);
      toast.success("Vídeo sequencial gerado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  const regenOne = async (idx: number) => {
    if (!manifest || !falApiKey) return;
    setBusyScene(idx);
    try {
      await regenerateScene(
        {
          apiKey: falApiKey,
          manifest,
          modelConfig: model,
          quality: "standard",
          onProgress: setProgress,
          onSceneUpdate: (s) => updateScene(s.order - 1, s),
        },
        idx,
      );
      toast.success(`Cena ${idx + 1} regerada.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyScene(null);
      setProgress("");
    }
  };

  const downloadManifest = () => {
    if (!manifest) return;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${manifest.title.replace(/\s+/g, "_")}_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Vídeo Sequencial</h1>
          <p className="text-xs text-muted-foreground">
            Cenas curtas unidas em um vídeo só, com mesma fala e personagem.
          </p>
        </div>
      </div>

      {/* STEP 1 */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">1. Conteúdo</h2>
          <Badge variant="outline" className="text-[10px]">Passo 1 de 3</Badge>
        </div>

        {/* Essenciais: título + roteiro */}
        <div className="space-y-1.5">
          <Label className="text-xs">Título do vídeo</Label>
          <Input className="h-9" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: anúncio do produto X" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Prompt visual (descrição base do personagem/cenário)</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
            className="text-sm"
            placeholder="Mulher de 30 anos, jaqueta jeans, cozinha clara, gravando vídeo selfie..." />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Roteiro completo <span className="text-muted-foreground font-normal">— dividido entre as cenas, sem repetir</span></Label>
          <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={4}
            className="text-sm"
            placeholder="Cole o texto inteiro que o personagem deve falar. O sistema divide automaticamente." />
        </div>

        {/* Linha compacta com parâmetros principais */}
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Duração total</Label>
            <div className="relative">
              <Input className="h-9 pr-8" type="number" min={5} max={180} value={totalDuration}
                onChange={(e) => setTotalDuration(Number(e.target.value))} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">s</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Por cena</Label>
            <Select value={String(sceneDuration)} onValueChange={(v) => setSceneDuration(Number(v) as 5 | 8 | 10)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5s</SelectItem>
                <SelectItem value="8">8s</SelectItem>
                <SelectItem value="10">10s</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Formato</Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait_9_16">📱 9:16</SelectItem>
                <SelectItem value="landscape_16_9">🖥️ 16:9</SelectItem>
                <SelectItem value="square_hd">⬛ 1:1</SelectItem>
                <SelectItem value="portrait_4_5">📷 4:5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Idioma</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Configurações avançadas */}
        <Accordion type="single" collapsible className="rounded-md border border-border/60">
          <AccordionItem value="advanced" className="border-0">
            <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
              <span className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" />
                Configurações avançadas
                <span className="text-muted-foreground font-normal">— modelo, referências, áudio, API key</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 px-3 pb-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Modelo de vídeo</Label>
                <Select value={modelKey} onValueChange={setModelKey}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(VIDEO_MODELS.map((m) => m.provider))).map((p) => (
                      <SelectGroup key={p}>
                        <SelectLabel>{p}</SelectLabel>
                        {VIDEO_MODELS.filter((m) => m.provider === p).map((m) => (
                          <SelectItem key={`${m.id}__${m.quality}`} value={`${m.id}__${m.quality}`}>
                            {m.name} · {m.quality} · ${m.cost_per_5s}/5s
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Referência de personagem</Label>
                  <InputImagePicker value={characterRef} onChange={setCharacterRef} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Referência de cenário</Label>
                  <InputImagePicker value={environmentRef} onChange={setEnvironmentRef} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Modo de áudio</Label>
                  <Select value={audioMode} onValueChange={(v) => setAudioMode(v as typeof audioMode)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tts_external">TTS externo (recomendado)</SelectItem>
                      <SelectItem value="native">Fala nativa do modelo</SelectItem>
                      <SelectItem value="silent">Sem áudio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Voz TTS</Label>
                  <Input className="h-9" value={voice} onChange={(e) => setVoice(e.target.value)}
                    placeholder="Nome da voz (PlayAI)" disabled={audioMode !== "tts_external"} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">fal.ai API Key</Label>
                <div className="flex gap-2">
                  <Input className="h-9" type={showKey ? "text" : "password"} value={falApiKey}
                    onChange={(e) => setFalApiKey(e.target.value)} placeholder="fal_..." />
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button onClick={buildManifest} className="w-full">
          Gerar manifesto →
        </Button>
      </Card>

      {/* STEP 2 */}
      {manifest && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">2. Cenas ({manifest.total_scenes})</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">Seed {manifest.seed}</Badge>
              <Button variant="outline" size="sm" onClick={downloadManifest}>
                <Download className="mr-1 h-3 w-3" /> JSON
              </Button>
            </div>
          </div>

          {validation && !validation.ok && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {validation.errors.join(" · ")}
            </div>
          )}

          <div className="space-y-2">
            {manifest.scenes.map((s, i) => (
              <SceneRow
                key={s.scene_id}
                scene={s}
                index={i}
                busy={busyScene === i}
                generating={generating}
                anyDone={manifest.scenes.some((sc) => sc.status === "done" || sc.status === "error")}
                onUpdate={(patch) => updateScene(i, patch)}
                onRegen={() => regenOne(i)}
              />
            ))}
          </div>

          <Button onClick={generateAll} disabled={generating || !!(validation && !validation.ok)} className="w-full">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}
            Gerar vídeo sequencial
          </Button>
          {progress && <p className="text-center text-xs text-muted-foreground">{progress}</p>}
        </Card>
      )}

      {/* STEP 3 */}
      {mergedUrl && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">3. Vídeo final</h2>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500">pronto</Badge>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={mergedUrl} download target="_blank" rel="noreferrer">
                <Download className="mr-1 h-3 w-3" /> Baixar MP4
              </a>
            </Button>
          </div>
          <div className="flex justify-center rounded-md bg-muted/30 p-2">
            <video
              src={mergedUrl}
              controls
              autoPlay
              className={cn(
                "rounded-md bg-black object-contain",
                aspect === "9:16" && "max-h-[60vh] w-auto",
                aspect === "16:9" && "w-full max-w-2xl",
                aspect === "1:1" && "max-h-[50vh] w-auto",
                aspect === "4:5" && "max-h-[55vh] w-auto",
              )}
            />
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Todas as cenas unidas em um único MP4. Use o botão acima para baixar.
          </p>
        </Card>
      )}
    </div>
  );
}

function SceneRow({
  scene: s,
  index: i,
  busy,
  generating,
  anyDone,
  onUpdate,
  onRegen,
}: {
  scene: Scene;
  index: number;
  busy: boolean;
  generating: boolean;
  anyDone: boolean;
  onUpdate: (patch: Partial<Scene>) => void;
  onRegen: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(
      "rounded-md border border-border",
      s.status === "done" && "border-emerald-500/40 bg-emerald-500/5",
      s.status === "error" && "border-destructive/40 bg-destructive/5",
      s.status === "generating" && "border-primary/40 bg-primary/5",
    )}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">{s.scene_id}</Badge>
          <span className="text-[11px] text-muted-foreground shrink-0">{s.start_time}–{s.end_time} · {s.duration_seconds}s</span>
          <span className="truncate text-xs text-foreground/80">{s.dialogue_chunk}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {s.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {s.status === "generating" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {s.status === "error" && <AlertTriangle className="h-4 w-4 text-destructive" />}
          <span className="text-[10px] text-muted-foreground">{open ? "fechar" : "editar"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border/60 px-3 py-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Fala (dialogue_chunk)</Label>
            <Textarea rows={2} className="text-xs" value={s.dialogue_chunk}
              onChange={(e) => onUpdate({ dialogue_chunk: e.target.value })} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Ação visual</Label>
              <Input className="h-8 text-xs" value={s.visual_action} onChange={(e) => onUpdate({ visual_action: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Emoção</Label>
              <Input className="h-8 text-xs" value={s.emotion} onChange={(e) => onUpdate({ emotion: e.target.value })} />
            </div>
          </div>

          {s.error && <p className="text-[11px] text-destructive">{s.error}</p>}

          {s.final_url && (
            <video src={s.final_url} controls className="w-full max-w-[200px] rounded" />
          )}

          {anyDone && (
            <Button size="sm" variant="outline" disabled={busy || generating} onClick={onRegen}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span className="ml-1 text-xs">Regerar cena</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}