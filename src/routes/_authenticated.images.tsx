import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/images")({
  head: () => ({ meta: [{ title: "Imagens — VideoForge AI" }] }),
  component: () => (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="mb-2 text-3xl font-bold">Imagens</h1>
      <p className="text-muted-foreground">Suas imagens geradas aparecerão aqui.</p>
    </div>
  ),
});