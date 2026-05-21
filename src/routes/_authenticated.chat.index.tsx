import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Film, Image as ImageIcon, Loader2, Send, Settings2, Sparkles } from "lucide-react";
import { createConversation, sendChatMessage } from "@/lib/chat.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatEmpty,
});

type Mode = "image" | "video";
type Provider = "kling" | "xai" | "sora" | "veo3";

type StartConfig = {
  mode: Mode;
  provider: Provider;
  duration: number;
  perScene: 5 | 10;
  aspect: "16:9" | "9:16" | "1:1";
};

const DEFAULT_START_CFG: StartConfig = {
  mode: "image",
  provider: "kling",
  duration: 5,
  perScene: 5,
  aspect: "16:9",
};

function loadStartCfg(): StartConfig {
  if (typeof window === "undefined") return DEFAULT_START_CFG;
  try {
    return { ...DEFAULT_START_CFG, ...JSON.parse(localStorage.getItem("chat_config") ?? "{}") };
  } catch {
    return DEFAULT_START_CFG;
  }
}

function ChatEmpty() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createConversation);
  const send = useServerFn(sendChatMessage);
  const [prompt, setPrompt] = useState("");
  const [cfg, setCfg] = useState<StartConfig>(DEFAULT_START_CFG);

  useEffect(() => {
    setCfg(loadStartCfg());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("chat_config", JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  }, [cfg]);

  const patch = (p: Partial<StartConfig>) => setCfg((c) => ({ ...c, ...p }));

  const start = useMutation({
    mutationFn: async (text: string) => {
      const { id } = await create({ data: { mode: cfg.mode, provider: cfg.provider, title: text.slice(0, 60) } });
      await send({
        data: {
          conversationId: id,
          prompt: text,
          mode: cfg.mode,
          provider: cfg.provider,
          durationSeconds: cfg.perScene,
          totalDurationSeconds: cfg.duration,
          aspectRatio: cfg.aspect,
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
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {cfg.mode === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          </span>
          {cfg.mode === "video" ? "Vídeo" : "Imagem"} · {cfg.provider === "xai" ? "xAI" : cfg.provider}
        </h2>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-2 py-1">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <QuickSettings cfg={cfg} patch={patch} />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">Comece uma conversa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha imagem ou vídeo e envie o primeiro prompt.
          </p>
        </div>
      </div>
      <div className="border-t border-border bg-background/95 p-4 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mx-auto max-w-3xl"
        >
          <div className="flex items-end gap-2 rounded-xl border border-border bg-card/60 p-2 shadow-sm">
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
