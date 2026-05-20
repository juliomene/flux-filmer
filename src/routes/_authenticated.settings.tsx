import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — VideoForge AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useQuery({
    queryKey: ["profile-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      return { user, profile };
    },
  });

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold">Configurações</h1>
      <Card className="border-border bg-card/50 p-6">
        <h2 className="mb-4 font-semibold">Conta</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Nome</dt><dd>{data?.profile?.display_name ?? "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">E-mail</dt><dd>{data?.user?.email}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Créditos</dt><dd className="font-semibold text-primary">{data?.profile?.credits ?? 0}</dd></div>
        </dl>
      </Card>
    </div>
  );
}