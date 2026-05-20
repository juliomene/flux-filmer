import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GenerationControls } from "@/components/app/GenerationControls";
import { InputImagePicker } from "@/components/app/InputImagePicker";
import { getProvider, type ProviderId } from "@/lib/providers";
import { generateImageFn } from "@/lib/generate.functions";

export const Route = createFileRoute("/_authenticated/images")({
  head: () => ({ meta: [{ title: "Criar imagem — Forge interno" }] }),
  component: ImagesPage,
});

function ImagesPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateImageFn);
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState<string>(getProvider("openai").defaultImageModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState("");

  const history = useQuery({
    queryKey: ["images-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_images")
        .select("id, prompt, image_url, model, provider, status, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: () =>
      generate({
        data: {
          provider, model, apiKey, prompt,
          inputImageUrl: inputImage || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Imagem gerada");
      qc.invalidateQueries({ queryKey: ["images-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-3xl font-bold">Criar imagem</h1>

      <Card className="border-border bg-card/50 p-6">
        <form
          className="space-y-5"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        >
          <GenerationControls
            kind="image"
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
              placeholder="Descreva a imagem que você quer gerar"
            />
          </div>

          <InputImagePicker value={inputImage} onChange={setInputImage} />

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Gerar imagem</>
            )}
          </Button>
        </form>
      </Card>

      {mutation.data?.url && (
        <Card className="mt-6 border-border bg-card/50 p-4">
          <p className="mb-2 text-sm text-muted-foreground">Última geração:</p>
          <a href={mutation.data.url} target="_blank" rel="noreferrer">
            <img src={mutation.data.url} alt="resultado" className="max-h-[60vh] w-full rounded-md object-contain" />
          </a>
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
              {img.image_url ? (
                <a href={img.image_url} target="_blank" rel="noreferrer">
                  <img src={img.image_url} alt={img.prompt} className="aspect-square w-full object-cover" />
                </a>
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted text-xs text-destructive">
                  {img.status}
                </div>
              )}
              <div className="p-2 text-xs">
                <p className="line-clamp-2 text-foreground/80">{img.prompt}</p>
                <p className="mt-1 text-muted-foreground">{img.provider} · {img.model}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}