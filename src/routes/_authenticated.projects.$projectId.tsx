import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateImage, startSceneVideo, pollScene } from "@/lib/generation.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImageIcon, Film, ArrowLeft } from "lucide-react";
import { formatUsd } from "@/lib/costs";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({ meta: [{ title: "Projeto — VideoForge AI" }] }),
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const genImg = useServerFn(generateImage);
  const startVid = useServerFn(startSceneVideo);
  const poll = useServerFn(pollScene);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
      return data;
    },
  });

  const { data: scenes } = useQuery({
    queryKey: ["scenes", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_scenes")
        .select("*")
        .eq("project_id", projectId)
        .order("scene_index");
      return data ?? [];
    },
    refetchInterval: (q) => {
      const list = q.state.data ?? [];
      return list.some((s) => s.status === "generating_image" || s.status === "generating_clip") ? 4000 : false;
    },
  });

  // Poll each generating_clip scene
  useEffect(() => {
    if (!scenes) return;
    const generating = scenes.filter((s) => s.status === "generating_clip");
    if (generating.length === 0) return;
    const t = setInterval(() => {
      generating.forEach((s) => {
        poll({ data: { sceneId: s.id } })
          .then(() => qc.invalidateQueries({ queryKey: ["scenes", projectId] }))
          .catch(() => {});
      });
    }, 5000);
    return () => clearInterval(t);
  }, [scenes, poll, projectId, qc]);

  const imgMut = useMutation({
    mutationFn: (sceneId: string) =>
      genImg({
        data: {
          prompt: scenes!.find((s) => s.id === sceneId)!.prompt,
          sceneId,
          projectId,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenes", projectId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vidMut = useMutation({
    mutationFn: (sceneId: string) => startVid({ data: { sceneId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenes", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!project) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Projetos
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.prompt}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Custo total do projeto</p>
          <p className="text-2xl font-bold text-primary">{formatUsd(project.total_cost_usd)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {(scenes ?? []).map((s) => (
          <Card key={s.id} className="overflow-hidden border-border bg-card/50">
            <div className="grid gap-4 p-4 md:grid-cols-[200px_1fr]">
              <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                {s.video_clip_url ? (
                  <video src={s.video_clip_url} controls className="h-full w-full object-cover" />
                ) : s.image_url ? (
                  <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Cena {s.scene_index + 1}</h3>
                  <Badge variant={s.status === "ready" ? "default" : "secondary"} className="capitalize">
                    {s.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{s.prompt}</p>
                <p className="text-xs text-muted-foreground">Custo: {formatUsd(s.cost_usd)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => imgMut.mutate(s.id)}
                    disabled={imgMut.isPending || s.status === "generating_image" || s.status === "generating_clip"}
                  >
                    {s.status === "generating_image" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="mr-1 h-4 w-4" /> {s.image_url ? "Regerar imagem" : "Gerar imagem"}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => vidMut.mutate(s.id)}
                    disabled={!s.image_url || vidMut.isPending || s.status === "generating_clip" || !!s.video_clip_url}
                    className="text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {s.status === "generating_clip" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Film className="mr-1 h-4 w-4" /> Animar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}