import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Criar vídeo — VideoForge AI" }] }),
  component: () => (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="mb-2 text-3xl font-bold">Criar vídeo</h1>
      <p className="mb-8 text-muted-foreground">O wizard de geração será habilitado na próxima etapa.</p>
      <Card className="flex flex-col items-center gap-3 border-dashed border-border bg-card/40 p-10 text-center">
        <Wand2 className="h-10 w-10 text-primary" />
        <p className="text-lg font-semibold">Geração de vídeo em breve</p>
        <p className="max-w-md text-sm text-muted-foreground">Vamos integrar fal.ai (roteiro → imagens → clipes → composição) na Fase 3 do plano.</p>
      </Card>
    </div>
  ),
});