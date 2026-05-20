import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createConversation, sendChatMessage } from "@/lib/chat.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatEmpty,
});

const SUGGESTIONS = [
  { icon: "🖼️", text: "Uma cidade futurista ao pôr-do-sol, estilo cinematográfico", mode: "image" as const },
  { icon: "🎬", text: "Um drone sobrevoando um oceano com baleias saltando", mode: "video" as const },
  { icon: "✨", text: "Retrato hiperrealista de uma astronauta com reflexos em capacete", mode: "image" as const },
  { icon: "🎭", text: "Animação de uma floresta encantada com luzes mágicas, 5 segundos", mode: "video" as const },
];

function ChatEmpty() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createConversation);
  const send = useServerFn(sendChatMessage);

  const start = useMutation({
    mutationFn: async (s: (typeof SUGGESTIONS)[number]) => {
      const { id } = await create({ data: { mode: s.mode, provider: "kling", title: s.text.slice(0, 60) } });
      await send({
        data: {
          conversationId: id,
          prompt: s.text,
          mode: s.mode,
          provider: "kling",
          durationSeconds: 5,
          aspectRatio: "16:9",
        },
      });
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      navigate({ to: "/chat/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">O que você quer criar hoje?</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Imagens e vídeos com IA. Clique numa sugestão ou crie uma nova conversa.
      </p>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <Card
            key={s.text}
            onClick={() => !start.isPending && start.mutate(s)}
            className="cursor-pointer border-border bg-card/50 p-4 transition hover:border-primary/50 hover:bg-card"
          >
            <div className="mb-2 text-2xl">{s.icon}</div>
            <p className="text-sm text-foreground/80">{s.text}</p>
            <p className="mt-2 text-[10px] uppercase text-muted-foreground">{s.mode}</p>
          </Card>
        ))}
      </div>
      {start.isPending && (
        <p className="mt-6 text-xs text-muted-foreground">Iniciando conversa e gerando…</p>
      )}
    </div>
  );
}