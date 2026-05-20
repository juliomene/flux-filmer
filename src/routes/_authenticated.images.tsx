import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/costs";

export const Route = createFileRoute("/_authenticated/images")({
  head: () => ({ meta: [{ title: "Imagens — VideoForge AI" }] }),
  component: ImagesPage,
});

function ImagesPage() {
  const { data: images } = useQuery({
    queryKey: ["images"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_images")
        .select("*")
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold">Imagens geradas</h1>
      {!images || images.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
          Nenhuma imagem gerada ainda.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden border-border bg-card/50">
              <div className="aspect-video bg-muted">
                {img.image_url && <img src={img.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-sm">{img.prompt}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Custo: {formatUsd(img.cost_usd)} · {img.model}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}