import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wand2, Film, DollarSign, Clock } from "lucide-react";
import { formatUsd } from "@/lib/costs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — VideoForge AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(6);
      return data ?? [];
    },
  });

  const isEmpty = !projects || projects.length === 0;

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Olá, {profile?.display_name ?? "criador"} 👋</h1>
          <p className="mt-1 text-muted-foreground">Pronto para criar seu próximo vídeo?</p>
        </div>
        <Link to="/create">
          <Button className="text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <Wand2 className="mr-2 h-4 w-4" /> Novo vídeo
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={DollarSign} label="Gasto total" value={formatUsd(profile?.total_spent_usd)} />
        <StatCard icon={Film} label="Projetos" value={projects?.length ?? 0} />
        <StatCard icon={Clock} label="Em produção" value={projects?.filter((p) => p.status !== "ready" && p.status !== "failed").length ?? 0} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projetos recentes</h2>
          {!isEmpty && (
            <Link to="/projects" className="text-sm text-primary hover:underline">Ver todos</Link>
          )}
        </div>
        {isEmpty ? (
          <Card className="border-border bg-card/50 p-10 text-center">
            <p className="text-muted-foreground">Você ainda não tem projetos.</p>
            <Link to="/create" className="mt-3 inline-block text-primary hover:underline">Criar o primeiro vídeo</Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects!.map((p) => (
              <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }}>
                <Card className="overflow-hidden border-border bg-card/50 transition hover:border-primary/50">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold">{p.title}</h3>
                      <Badge variant={p.status === "ready" ? "default" : "secondary"} className="shrink-0 capitalize">{p.status}</Badge>
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
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <Card className="flex items-center gap-4 border-border bg-card/50 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}