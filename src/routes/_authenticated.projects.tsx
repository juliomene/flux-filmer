import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projetos — VideoForge AI" }] }),
  component: () => (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="mb-2 text-3xl font-bold">Projetos</h1>
      <p className="text-muted-foreground">Sua biblioteca de vídeos aparecerá aqui.</p>
    </div>
  ),
});