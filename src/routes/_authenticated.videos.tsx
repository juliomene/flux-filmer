import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Film } from "lucide-react";
import { toast } from "sonner";
import { GenerationControls } from "@/components/app/GenerationControls";
import { InputImagePicker } from "@/components/app/InputImagePicker";
import { getProvider, type ProviderId } from "@/lib/providers";
import { startVideoFn, pollVideoFn } from "@/lib/generate.functions";

export const Route = createFileRoute("/_authenticated/videos")({
  head: () => ({ meta: [{ title: "Criar vídeo — Forge interno" }] }),
  component: VideosPage,
});

function VideosPage() {
  const qc = useQueryClient();
  const startVideo = useServerFn(startVideoFn);
  const pollVideo = useServerFn(pollVideoFn);

  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState<string>(getProvider("openai").defaultVideoModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState("");
  const [duration, setDuration] = useState(5);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeApiKey, setActiveApiKey] = useState<string>("");

  const startMutation = useMutation({
    mutationFn: () =>
      startVideo({
        data: {
          provider, model, apiKey, prompt,
          inputImageUrl: inputImage || undefined,
          durationSeconds: duration,
        },
      }),
    onSuccess: ({ jobId }) => {
      setActiveJobId(jobId);
      setActiveApiKey(apiKey);
      toast.success("Vídeo em processamento. Pode levar alguns minutos.");
      qc.invalidateQueries({ queryKey: ["videos-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = useQuery({
    queryKey: ["video-status", activeJobId],
    enabled: !!activeJobId,
    refetchInterval: (q) => {
      const d = q.state.data as { status?: string } | undefined;
      return d?.status === "processing" ? 8000 : false;
    },
    queryFn: () => pollVideo({ data: { jobId: activeJobId!, apiKey: activeApiKey } }),
  });

  // Refetch history when status flips to ready
  if (status.data?.status === "ready") {
    qc.invalidateQueries({ queryKey: ["videos-history"] });
  }

  const history = useQuery({
    queryKey: ["videos-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_videos")
        .select("id, prompt, video_url, model, provider, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-3xl font-bold">Criar vídeo</h1>

      <Card className="border-border bg-card/50 p-6">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); startMutation.mutate(); }}>
          <GenerationControls
            kind="video"
            value={{ provider, model, apiKey }}
            onChange={(v) => { setProvider(v.provider); setModel(v.model); setApiKey(v.apiKey); }}
          />

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a cena que você quer gerar"
            />
          </div>

          <InputImagePicker value={inputImage} onChange={setInputImage} />

          <div className="space-y-2">
            <Label htmlFor="duration">Duração (segundos)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={60}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="max-w-[140px]"
            />
          </div>

          <Button
            type="submit"
            disabled={startMutation.isPending || status.data?.status === "processing"}
            className="w-full text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {startMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>
            ) : (
              <><Film className="mr-2 h-4 w-4" /> Gerar vídeo</>
            )}
          </Button>
        </form>
      </Card>

      {activeJobId && (
        <Card className="mt-6 border-border bg-card/50 p-4">
          {status.data?.status === "processing" || !status.data ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Processando… (atualiza automaticamente)
            </div>
          ) : status.data.status === "ready" ? (
            <>
              <p className="mb-2 text-sm text-muted-foreground">Pronto:</p>
              <video src={status.data.url} controls className="w-full rounded-md" />
            </>
          ) : (
            <p className="text-sm text-destructive">Falhou: {status.data.error}</p>
          )}
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
              {v.video_url ? (
                <video src={v.video_url} controls className="aspect-video w-full bg-black object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted text-xs">
                  {v.status === "failed" ? (
                    <span className="px-2 text-destructive">{v.error_message ?? "falhou"}</span>
                  ) : (
                    <span className="text-muted-foreground">{v.status}</span>
                  )}
                </div>
              )}
              <div className="p-2 text-xs">
                <p className="line-clamp-2 text-foreground/80">{v.prompt}</p>
                <p className="mt-1 text-muted-foreground">{v.provider} · {v.model}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}