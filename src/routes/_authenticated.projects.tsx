import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, Film } from "lucide-react";
import { formatUsd } from "@/lib/costs";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projetos — VideoForge AI" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projetos</h1>
        <Link to="/create">
          <Button className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Wand2 className="mr-2 h-4 w-4" /> Novo
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : !projects || projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed border-border bg-card/40 p-10 text-center">
          <Film className="h-10 w-10 text-primary" />
          <p className="font-semibold">Sem projetos ainda</p>
          <Link to="/create" className="text-sm text-primary hover:underline">Criar o primeiro</Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }}>
              <Card className="overflow-hidden border-border bg-card/50 transition hover:border-primary/50">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-semibold">{p.title}</h3>
                    <Badge variant={p.status === "ready" ? "default" : "secondary"} className="shrink-0 capitalize">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.prompt}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Custo: {formatUsd(p.total_cost_usd)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}