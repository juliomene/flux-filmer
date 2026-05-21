import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Film, Eye, EyeOff, Download, ExternalLink, CheckCircle2, Clock, Music } from "lucide-react";
import { toast } from "sonner";
import { InputImagePicker } from "@/components/app/InputImagePicker";
import { useSettings } from "@/stores/settings";
import { VIDEO_MODELS, VIDEO_QUALITIES, FORMATS, generateLongVideo } from "@/lib/fal-client";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Criar Vídeo — Forge" }] }),
  component: CreatePage,
});

const TOTAL_DURATIONS = [5, 10, 20, 30, 60, 90, 120];
const SCENE_DURATIONS = [5, 10];

type SceneState = { status: "pending" | "generating" | "done" | "error"; url?: string };

function CreatePage() {
  const qc = useQueryClient();
  const { falApiKey, setFalApiKey, selectedVideoModel, setSelectedVideoModel, selectedFormat, setSelectedFormat, sceneDuration, setSceneDuration, totalDuration, setTotalDuration } = useSettings();

  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scenes, setScenes] = useState<SceneState[]>([]);
  const [progressMsg, setProgressMsg] = useState("");
  const [videoQuality, setVideoQuality] = useState<"standard" | "pro">("standard");
  const [withAudio, setWithAudio] = useState(false);
  const [audioPrompt, setAudioPrompt] = useState("");

  const model = VIDEO_MODELS.find((m) => m.id === selectedVideoModel) ?? VIDEO_MODELS[0];
  const effSceneDur = Math.min(sceneDuration, model.max_duration) as 5 | 10;
  const sceneCount = Math.max(1, Math.ceil(totalDuration / effSceneDur));
  const qMult = VIDEO_QUALITIES.find((q) => q.id === videoQuality)?.price_multiplier ?? 1;
  const perScene = (effSceneDur === 10 ? model.cost_per_10s : model.cost_per_5s) * qMult;
  const videoCost = perScene * sceneCount;
  const audioCost = withAudio ? totalDuration * 0.01 : 0;
  const totalCost = (videoCost + audioCost).toFixed(2);

  const history = useQuery({
    queryKey: ["videos-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_videos")
        .select("id, prompt, video_url, model, provider, duration_s, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!falApiKey) throw new Error("Coloque sua chave fal.ai");
      if (!prompt.trim()) throw new Error("Digite um prompt");

      const initial: SceneState[] = Array.from({ length: sceneCount }, () => ({ status: "pending" }));
      setScenes(initial);

      const { clips, merged_url } = await generateLongVideo({
        apiKey: falApiKey,
        modelConfig: model,
        quality: videoQuality,
        prompt,
        totalDuration,
        sceneDuration: effSceneDur,
        formatId: selectedFormat,
        image_url: inputImage || undefined,
        withAudio,
        audioPrompt: withAudio ? (audioPrompt || `cinematic ambient soundtrack for: ${prompt}`) : undefined,
        onSceneProgress: (done, total, msg) => {
          setProgressMsg(msg);
          setScenes((prev) => prev.map((s, i) => {
            if (i < done) return { ...s, status: "done" };
            if (i === done && done < total) return { ...s, status: "generating" };
            return { ...s, status: "pending" };
          }));
        },
        onClipReady: (idx, url) => {
          setScenes((prev) => prev.map((s, i) => (i === idx ? { status: "done", url } : s)));
        },
      });

      const finalUrl = merged_url ?? clips[clips.length - 1] ?? "";

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && finalUrl) {
          await supabase.from("generated_videos").insert({
            user_id: user.id,
            prompt,
            video_url: finalUrl,
            model: model.id,
            provider: model.provider,
            duration_s: totalDuration,
            status: "ready",
          });
        }
      } catch { /* silencioso */ }

      return { url: finalUrl, clips };
    },
    onSuccess: () => {
      toast.success("Vídeo pronto");
      setProgressMsg("");
      qc.invalidateQueries({ queryKey: ["videos-history"] });
    },
    onError: (e: Error) => { toast.error(e.message); setProgressMsg(""); },
  });

  const doneCount = scenes.filter((s) => s.status === "done").length;
  const progressPct = scenes.length ? (doneCount / scenes.length) * 100 : 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold">
        <Film className="h-7 w-7 text-primary" /> Criar Vídeo
      </h1>

      <Card className="space-y-5 border-border bg-card/50 p-6">
        <div className="space-y-2">
          <Label>Modelo de vídeo</Label>
          <Select value={selectedVideoModel} onValueChange={setSelectedVideoModel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VIDEO_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} <span className="text-muted-foreground">· {m.provider} · ${m.cost_per_10s}/10s</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">{model.provider}</Badge>
            <Badge variant="outline">5s: ${model.cost_per_5s}</Badge>
            <Badge variant="outline">10s: ${model.cost_per_10s}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Qualidade do vídeo</Label>
          <div className="flex flex-wrap gap-2">
            {VIDEO_QUALITIES.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setVideoQuality(q.id as "standard" | "pro")}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  videoQuality === q.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                )}
              >
                {q.label} <span className="text-xs text-muted-foreground">— {q.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Formato</Label>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFormat(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  selectedFormat === f.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                )}
              >
                {f.icon} {f.label} <span className="text-xs text-muted-foreground">({f.ratio})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Duração total</Label>
            <div className="flex flex-wrap gap-2">
              {TOTAL_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTotalDuration(d)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    totalDuration === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duração por cena</Label>
            <div className="flex flex-wrap gap-2">
              {SCENE_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSceneDuration(d)}
                  disabled={d > model.max_duration}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-40",
                    sceneDuration === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div>{sceneCount} cena{sceneCount > 1 ? "s" : ""} × ${perScene.toFixed(2)} = <span className="font-medium">${videoCost.toFixed(2)}</span></div>
          {withAudio && <div>Áudio {totalDuration}s = <span className="font-medium">${audioCost.toFixed(2)}</span></div>}
          <div className="border-t border-border/60 pt-1">Total estimado ≈ <span className="font-semibold">${totalCost}</span></div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt do vídeo</Label>
          <Textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a cena que você quer gerar"
          />
        </div>

        <InputImagePicker value={inputImage} onChange={setInputImage} />

        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><Music className="h-4 w-4" /> Áudio IA</Label>
            <Switch checked={withAudio} onCheckedChange={setWithAudio} />
          </div>
          {withAudio && (
            <Input
              placeholder={`música ambiente cinematográfica para: ${prompt || "..."}`}
              value={audioPrompt}
              onChange={(e) => setAudioPrompt(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>API Key fal.ai</Label>
          <div className="flex gap-2">
            <Input
              type={showKey ? "text" : "password"}
              value={falApiKey}
              onChange={(e) => setFalApiKey(e.target.value)}
              placeholder="fal_..."
              autoComplete="off"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((s) => !s)}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="outline" size="icon" asChild>
              <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Salva só no navegador. Mesma chave de /images.</p>
        </div>

        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          {mutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>
          ) : (
            <><Film className="mr-2 h-4 w-4" /> Gerar vídeo</>
          )}
        </Button>
      </Card>

      {scenes.length > 0 && (
        <Card className="mt-6 space-y-3 border-border bg-card/50 p-4">
          <p className="text-sm font-medium">🎬 Vídeo de {totalDuration}s ({scenes.length} cena{scenes.length > 1 ? "s" : ""})</p>
          <div className="space-y-1">
            {scenes.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {s.status === "done" ? <CheckCircle2 className="h-4 w-4 text-primary" />
                  : s.status === "generating" ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  : <Clock className="h-4 w-4 text-muted-foreground" />}
                <span>Cena {i + 1}/{scenes.length}</span>
                <span className="text-muted-foreground">— {s.status === "done" ? "concluída" : s.status === "generating" ? "gerando..." : "aguardando"}</span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="ml-auto text-xs text-primary underline">
                    preview
                  </a>
                )}
              </div>
            ))}
          </div>
          <Progress value={progressPct} />
          {progressMsg && <p className="text-xs text-muted-foreground">{progressMsg}</p>}
        </Card>
      )}

      {mutation.data?.url && (
        <Card className="mt-6 space-y-3 border-border bg-card/50 p-4">
          <p className="text-sm text-muted-foreground">{totalDuration}s • {mutation.data.clips.length} cena{mutation.data.clips.length > 1 ? "s" : ""}</p>
          <video src={mutation.data.url} controls className="w-full rounded-md bg-black" />
          <Button asChild variant="outline" size="sm">
            <a href={mutation.data.url} target="_blank" rel="noreferrer" download>
              <Download className="mr-2 h-4 w-4" /> Baixar MP4
            </a>
          </Button>
        </Card>
      )}

      <h2 className="mb-3 mt-10 text-xl font-semibold">Histórico</h2>
      {history.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (history.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {history.data!.map((v) => (
            <Card key={v.id} className="overflow-hidden border-border bg-card/50">
              {v.video_url && <video src={v.video_url} controls className="aspect-video w-full bg-black object-cover" />}
              <div className="p-2 text-xs">
                <p className="line-clamp-2 text-foreground/80">{v.prompt}</p>
                <p className="mt-1 text-muted-foreground">{v.provider} · {v.duration_s}s</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}