import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { createConversation, sendChatMessage } from "@/lib/chat.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatEmpty,
});

function ChatEmpty() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createConversation);
  const send = useServerFn(sendChatMessage);
  const [prompt, setPrompt] = useState("");

  const start = useMutation({
    mutationFn: async (text: string) => {
      const { id } = await create({
        data: { mode: "image", provider: "kling", title: text.slice(0, 60) },
      });
      await send({
        data: {
          conversationId: id,
          prompt: text,
          mode: "image",
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

  const submit = () => {
    const v = prompt.trim();
    if (!v || start.isPending) return;
    start.mutate(v);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1" />
      <div className="border-t border-border bg-card/30 p-4 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mx-auto max-w-3xl"
        >
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Digite aqui…"
              rows={1}
              className="min-h-[40px] resize-none border-0 bg-transparent focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!prompt.trim() || start.isPending}
              className="text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {start.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}