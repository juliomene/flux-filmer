import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Image as ImageIcon, Film, Search } from "lucide-react";
import { createConversation, deleteConversation } from "@/lib/chat.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat IA — Forge" }] }),
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <div className="flex h-[calc(100vh-0px)] md:h-screen min-h-0">
      <ChatSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}

function ChatSidebar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string };
  const create = useServerFn(createConversation);
  const del = useServerFn(deleteConversation);
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations" as never)
        .select("id,title,mode,provider,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; title: string; mode: string; provider: string; updated_at: string;
      }>;
    },
  });

  const newConv = useMutation({
    mutationFn: () => create({ data: { mode: "image", provider: "kling" } }),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      navigate({ to: "/chat/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeConv = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (params.id === id) navigate({ to: "/chat" });
    },
  });

  const filtered = (list.data ?? []).filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/30 md:flex">
      <div className="space-y-2 border-b border-border p-3">
        <Button
          onClick={() => newConv.mutate()}
          className="w-full justify-start text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova conversa
        </Button>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {filtered.length === 0 && !list.isLoading && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nenhuma conversa ainda
            </p>
          )}
          {filtered.map((c) => {
            const active = params.id === c.id;
            const Icon = c.mode === "video" ? Film : ImageIcon;
            return (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  active ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <Link
                  to="/chat/$id"
                  params={{ id: c.id }}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.updated_at), { locale: ptBR, addSuffix: false })}
                  </span>
                </Link>
                <button
                  onClick={() => removeConv.mutate(c.id)}
                  className="opacity-0 transition group-hover:opacity-100"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="border-t border-border p-2 text-center">
        <Link to="/images" className="text-xs text-muted-foreground hover:text-foreground">
          ← Voltar para Imagens
        </Link>
      </div>
    </aside>
  );
}

export { ChatSidebar };