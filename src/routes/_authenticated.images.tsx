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
import { Loader2, Sparkles, Eye, EyeOff, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { InputImagePicker } from "@/components/app/InputImagePicker";
import { useSettings } from "@/stores/settings";
import { IMAGE_MODELS, FORMATS, IMAGE_QUALITIES, generateImage } from "@/lib/fal-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/images")({
  head: () => ({ meta: [{ title: "Gerar Imagem — Forge" }] }),
  component: ImagesPage,
});

function ImagesPage() {
  const qc = useQueryClient();
  const { falApiKey, setFalApiKey, selectedImageModel, setSelectedImageModel, selectedFormat, setSelectedFormat, imageQuality, setImageQuality } = useSettings();

  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  const model = IMAGE_MODELS.find((m) => m.id === selectedImageModel) ?? IMAGE_MODELS[0];
  const quality = IMAGE_QUALITIES.find((q) => q.id === imageQuality) ?? IMAGE_QUALITIES[0];
  const baseCost = parseFloat(model.cost_per_image.replace("$", ""));
  const estCost = (baseCost * quality.multiplier).toFixed(4);

  const history = useQuery({
    queryKey: ["images-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_images")
        .select("id, prompt, image_url, model, provider, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!falApiKey) throw new Error("Coloque sua chave fal.ai");
      if (!prompt.trim()) throw new Error("Digite um prompt");
      const { url } = await generateImage({
        apiKey: falApiKey,
        modelId: model.id,
        prompt,
        formatId: selectedFormat,
        quality: imageQuality,
        image_url: inputImage || undefined,
        onProgress: setProgressMsg,
      });
      // Histórico (silencioso)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("generated_images").insert({
          user_id: user?.id,
          prompt,
          image_url: url,
          model: model.id,
          provider: model.provider,
        });
      } catch { /* silencioso */ }
      return { url };
    },
    onSuccess: () => {
      toast.success("Imagem gerada");
      setProgressMsg("");
      qc.invalidateQueries({ queryKey: ["images-history"] });
    },
    onError: (e: Error) => { toast.error(e.message); setProgressMsg(""); },
  });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold">
        <Sparkles className="h-7 w-7 text-primary" /> Gerar Imagem
      </h1>

      <Card className="space-y-5 border-border bg-card/50 p-6">
        <div className="space-y-2">
          <Label>Modelo</Label>
          <Select value={selectedImageModel} onValueChange={setSelectedImageModel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IMAGE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} <span className="text-muted-foreground">· {m.provider} · {m.cost_per_image}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">{model.provider}</Badge>
            <Badge variant="outline">{model.speed}</Badge>
            <Badge variant="outline">~{model.cost_per_image}/img</Badge>
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

        <div className="space-y-2">
          <Label>Qualidade</Label>
          <div className="flex flex-wrap gap-2">
            {IMAGE_QUALITIES.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setImageQuality(q.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  imageQuality === q.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a imagem que você quer gerar"
          />
        </div>

        {model.supports_image_input && (
          <InputImagePicker value={inputImage} onChange={setInputImage} />
        )}

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
          <p className="text-xs text-muted-foreground">Salva só no navegador. Nunca enviada ao servidor.</p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm">
            <p className="text-muted-foreground">Custo estimado</p>
            <p className="text-lg font-semibold">~${estCost}</p>
          </div>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Gerar imagem</>
            )}
          </Button>
        </div>
        {progressMsg && <p className="text-xs text-muted-foreground">{progressMsg}</p>}
      </Card>

      {mutation.data?.url && (
        <Card className="mt-6 border-border bg-card/50 p-4">
          <p className="mb-2 text-sm text-muted-foreground">Resultado:</p>
          <img src={mutation.data.url} alt="resultado" className="max-h-[70vh] w-full rounded-md object-contain" />
          <div className="mt-3 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={mutation.data.url} target="_blank" rel="noreferrer" download>
                <Download className="mr-2 h-4 w-4" /> Baixar
              </a>
            </Button>
          </div>
        </Card>
      )}

      <h2 className="mb-3 mt-10 text-xl font-semibold">Histórico</h2>
      {history.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (history.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {history.data!.map((img) => (
            <Card key={img.id} className="overflow-hidden border-border bg-card/50">
              <a href={img.image_url} target="_blank" rel="noreferrer">
                <img src={img.image_url} alt={img.prompt} className="aspect-square w-full object-cover" />
              </a>
              <div className="p-2 text-xs">
                <p className="line-clamp-2 text-foreground/80">{img.prompt}</p>
                <p className="mt-1 text-muted-foreground">{img.provider} · {img.model.split("/").slice(-1)[0]}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}