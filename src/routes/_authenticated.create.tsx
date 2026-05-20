import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createProjectFromPrompt } from "@/lib/generation.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Criar vídeo — VideoForge AI" }] }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const create = useServerFn(createProjectFromPrompt);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [numScenes, setNumScenes] = useState(3);

  const mutation = useMutation({
    mutationFn: () => create({ data: { title, prompt, numScenes } }),
    onSuccess: ({ projectId }) => {
      toast.success("Roteiro pronto! Gere as imagens das cenas.");
      navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-3xl font-bold">Criar novo vídeo</h1>
      <Card className="border-border bg-card/50 p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Viagem para Marte" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Ideia / tema</Label>
            <Textarea
              id="prompt"
              required
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o vídeo que você quer criar. Quanto mais detalhado, melhor o resultado."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenes">Número de cenas (5s cada)</Label>
            <Input
              id="scenes"
              type="number"
              min={1}
              max={8}
              value={numScenes}
              onChange={(e) => setNumScenes(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Cada cena custa ~$0.003 (imagem Flux) + ~$0.25 (vídeo Kling 5s).
            </p>
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" /> Gerar roteiro
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}