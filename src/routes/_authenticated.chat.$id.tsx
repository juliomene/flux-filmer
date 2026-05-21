import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Send, Settings2, Paperclip, Download, X } from "lucide-react";
import { sendChatMessage } from "@/lib/chat.functions";
import { ALL_LANGUAGES } from "@/lib/fal-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatView,
});

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string | null;
  attachments: Array<{ url: string; type: string }>;
  result_type: "image" | "video" | "multi" | "error" | null;
  result_url: string | null;
  created_at: string;
};

type Provider = "kling" | "xai" | "sora" | "veo3";
type Mode = "image" | "video";

type OverlayCfg = {
  enabled: boolean;
  text: string;
  position: "top" | "center" | "bottom";
  color: string;
  bg: string;
  opacity: number; // 0..100
};

type ChatConfig = {
  mode: Mode;
  provider: Provider;
  apiKey: string;
  duration: number; // total seconds
  perScene: 5 | 10;
  aspect: "16:9" | "9:16" | "1:1";
  audioType: "none" | "music" | "speech" | "both";
  language: string;
  style: string;
  overlay: OverlayCfg;
};

const DEFAULT_CFG: ChatConfig = {
  mode: "image",
  provider: "kling",
  apiKey: "",
  duration: 5,
  perScene: 5,
  aspect: "16:9",
  audioType: "none",
  language: "Portuguese",
  style: "cinematic",
  overlay: {
    enabled: false,
    text: "",
    position: "bottom",
    color: "#ffffff",
    bg: "#000000",
    opacity: 50,
  },
};

function loadCfg(): ChatConfig {
  if (typeof window === "undefined") return DEFAULT_CFG;
  try {
    const raw = localStorage.getItem("chat_config");
    if (!raw) return DEFAULT_CFG;
    return { ...DEFAULT_CFG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CFG;
  }
}

function ChatView() {
  const { id: conversationId } = Route.useParams();
  const qc = useQueryClient();
  const send = useServerFn(sendChatMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [cfg, setCfg] = useState<ChatConfig>(DEFAULT_CFG);
  const [attachedUrl, setAttachedUrl] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setCfg(loadCfg());
  }, []);
  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem("chat_config", JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  }, [cfg]);

  const { mode, provider, duration, aspect } = cfg;
  const patch = (p: Partial<ChatConfig>) => setCfg((c) => ({ ...c, ...p }));
  const patchOverlay = (p: Partial<OverlayCfg>) =>
    setCfg((c) => ({ ...c, overlay: { ...c.overlay, ...p } }));

  // Hydrate config from conversation
  // Hydrate config from conversation — ONCE per conversation id, otherwise
  // every refetch overrides the user's selections (caused the "config keeps
  // resetting" bug where chat only worked right after Nova conversa).
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (hydratedRef.current === conversationId) return;
    hydratedRef.current = conversationId;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations" as never)
        .select("mode,provider")
        .eq("id", conversationId)
        .single();
      const row = data as { mode: Mode; provider: Provider } | null;
      if (!cancelled && row) {
        setCfg((c) => ({ ...c, mode: row.mode, provider: row.provider }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const messages = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages" as never)
        .select("id,role,content,attachments,result_type,result_url,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    refetchInterval: (q) => {
      // poll while a generation is likely in flight (last msg is user with no assistant reply)
      const list = (q.state.data ?? []) as Message[];
      const last = list[list.length - 1];
      return last?.role === "user" ? 2500 : false;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data?.length]);

  const sendMut = useMutation({
    mutationFn: (vars: { prompt: string; imageUrl?: string }) =>
      send({
        data: {
          conversationId,
          prompt: vars.prompt,
          mode,
          provider,
          durationSeconds: cfg.perScene,
          totalDurationSeconds: cfg.duration,
          aspectRatio: aspect,
          imageUrl: vars.imageUrl,
        },
      }),
    onMutate: () => {
      setPrompt("");
      setAttachedUrl("");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
    },
  });

  const list = messages.data ?? [];
  const lastIsUser = list[list.length - 1]?.role === "user";
  const totalScenes = mode === "video" ? Math.max(1, Math.ceil(duration / cfg.perScene)) : 1;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">
          {mode === "video" ? "🎬 Vídeo" : "🖼️ Imagem"} · {provider}
          {mode === "video" && totalScenes > 1 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {totalScenes} cenas × {cfg.perScene}s = {duration}s
            </span>
          )}
        </h2>
        <span className="text-xs text-muted-foreground">Config no botão ⚙️ abaixo</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.isLoading && <Skeleton className="h-20 w-full" />}
          {list.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
          {(lastIsUser || sendMut.isPending) && (
            <div className="flex justify-start">
              <Card className="border-border bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Gerando {mode === "video" ? "vídeo" : "imagem"}…
                </div>
                <Skeleton className="mt-3 h-40 w-64" />
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="relative border-t border-border bg-card/30 p-4 backdrop-blur">
        {showConfig && (
          <ConfigPanel
            cfg={cfg}
            patch={patch}
            patchOverlay={patchOverlay}
            onClose={() => setShowConfig(false)}
          />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
          if (prompt.trim() && !sendMut.isPending)
            sendMut.mutate({ prompt: prompt.trim(), imageUrl: attachedUrl || undefined });
          }}
          className="mx-auto max-w-3xl"
        >
          {attachedUrl && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
              <img src={attachedUrl} alt="anexo" className="h-10 w-10 rounded object-cover" />
              <span className="flex-1 truncate text-xs text-muted-foreground">{attachedUrl}</span>
              <button type="button" onClick={() => setAttachedUrl("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
            <AttachImageButton onAttach={setAttachedUrl} />
            <button
              type="button"
              onClick={() => setShowConfig((s) => !s)}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
                showConfig && "bg-accent text-foreground",
              )}
              aria-label="Configurações"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (prompt.trim() && !sendMut.isPending)
                    sendMut.mutate({ prompt: prompt.trim(), imageUrl: attachedUrl || undefined });
                }
              }}
              placeholder={mode === "video" ? "Descreva o vídeo…" : "Descreva a imagem…"}
              rows={1}
              className="min-h-[40px] resize-none border-0 bg-transparent focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!prompt.trim() || sendMut.isPending}
              className={cn(
                "text-primary-foreground",
                prompt.trim() ? "" : "opacity-50",
              )}
              style={{ background: "var(--gradient-primary)" }}
            >
              {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfigPanel({
  cfg,
  patch,
  patchOverlay,
  onClose,
}: {
  cfg: ChatConfig;
  patch: (p: Partial<ChatConfig>) => void;
  patchOverlay: (p: Partial<OverlayCfg>) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    // delay to skip the click that opened the panel
    const t = setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  const Chip = ({
    active,
    onClick: oc,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={oc}
      className={cn(
        "rounded-md border px-3 py-1 text-xs transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-1/2 z-30 mb-2 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl"
    >
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Modo</Label>
          <div className="mt-1 flex gap-2">
            <Chip active={cfg.mode === "image"} onClick={() => patch({ mode: "image" })}>
              Imagem
            </Chip>
            <Chip active={cfg.mode === "video"} onClick={() => patch({ mode: "video" })}>
              Vídeo
            </Chip>
          </div>
        </div>

        <div>
          <Label className="text-xs">Provedor</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["xai", "kling", "sora", "veo3"] as Provider[]).map((p) => (
              <Chip key={p} active={cfg.provider === p} onClick={() => patch({ provider: p })}>
                {p === "xai" ? "xAI" : p === "kling" ? "Kling" : p === "sora" ? "Sora" : "Veo3"}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">API Key (fal.ai)</Label>
          <Input
            value={cfg.apiKey}
            onChange={(e) => patch({ apiKey: e.target.value })}
            placeholder="fal_...."
            type="password"
            className="mt-1 h-8"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Salva apenas neste navegador. Servidor usa FAL_KEY global se vazio.
          </p>
        </div>

        {cfg.mode === "video" && (
          <>
            <div>
              <Label className="text-xs">Duração total</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {[5, 10, 20, 30, 60, 90].map((d) => (
                  <Chip key={d} active={cfg.duration === d} onClick={() => patch({ duration: d })}>
                    {d}s
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Por cena</Label>
              <div className="mt-1 flex gap-2">
                {[5, 10].map((d) => (
                  <Chip
                    key={d}
                    active={cfg.perScene === d}
                    onClick={() => patch({ perScene: d as 5 | 10 })}
                  >
                    {d}s
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Proporção</Label>
              <div className="mt-1 flex gap-2">
                {(["16:9", "9:16", "1:1"] as const).map((a) => (
                  <Chip key={a} active={cfg.aspect === a} onClick={() => patch({ aspect: a })}>
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Áudio</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {([
                  { id: "none", label: "Nenhum" },
                  { id: "music", label: "Música" },
                  { id: "speech", label: "Fala" },
                  { id: "both", label: "Ambos" },
                ] as const).map((a) => (
                  <Chip key={a.id} active={cfg.audioType === a.id} onClick={() => patch({ audioType: a.id })}>
                    {a.label}
                  </Chip>
                ))}
              </div>
              {(cfg.audioType === "speech" || cfg.audioType === "both") && cfg.provider === "kling" && (
                <p className="mt-1 text-[10px] text-amber-500">⚠️ Kling não gera fala sincronizada. Use xAI ou Veo3.</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Idioma</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {ALL_LANGUAGES.map((l) => (
                  <Chip key={l.code} active={cfg.language === l.code} onClick={() => patch({ language: l.code })}>
                    {l.label}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Overlay de texto</Label>
            <Switch
              checked={cfg.overlay.enabled}
              onCheckedChange={(v) => patchOverlay({ enabled: v })}
            />
          </div>
          {cfg.overlay.enabled && (
            <>
              <Input
                value={cfg.overlay.text}
                onChange={(e) => patchOverlay({ text: e.target.value })}
                placeholder="Texto a sobrepor"
                className="h-8"
              />
              <div>
                <Label className="text-xs">Posição</Label>
                <div className="mt-1 flex gap-2">
                  {(["top", "center", "bottom"] as const).map((p) => (
                    <Chip
                      key={p}
                      active={cfg.overlay.position === p}
                      onClick={() => patchOverlay({ position: p })}
                    >
                      {p === "top" ? "Topo" : p === "center" ? "Centro" : "Base"}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Cor texto</Label>
                  <input
                    type="color"
                    value={cfg.overlay.color}
                    onChange={(e) => patchOverlay({ color: e.target.value })}
                    className="mt-1 h-8 w-full rounded-md border border-border bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cor fundo</Label>
                  <input
                    type="color"
                    value={cfg.overlay.bg}
                    onChange={(e) => patchOverlay({ bg: e.target.value })}
                    className="mt-1 h-8 w-full rounded-md border border-border bg-background"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Opacidade do fundo: {cfg.overlay.opacity}%</Label>
                <Slider
                  value={[cfg.overlay.opacity]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) => patchOverlay({ opacity: v })}
                  className="mt-2"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: Message }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
          {m.attachments?.length > 0 && (
            <div className="mb-2 flex gap-1">
              {m.attachments.map((a, i) => (
                <img key={i} src={a.url} alt="" className="h-16 w-16 rounded object-cover" />
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm">{m.content}</p>
        </div>
      </div>
    );
  }
  if (m.result_type === "error") {
    return (
      <Card className="border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        ❌ {m.content}
      </Card>
    );
  }
  if (m.result_type === "image" && m.result_url) {
    return (
      <Card className="overflow-hidden border-border bg-card/50 p-2">
        <a href={m.result_url} target="_blank" rel="noreferrer">
          <img src={m.result_url} alt="" className="max-h-[60vh] w-auto rounded-md" />
        </a>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={m.result_url} download target="_blank" rel="noreferrer">
              <Download className="mr-1 h-3 w-3" /> Baixar
            </a>
          </Button>
        </div>
      </Card>
    );
  }
  if (m.result_type === "video" && m.result_url) {
    return (
      <Card className="overflow-hidden border-border bg-card/50 p-2">
        <video src={m.result_url} controls className="max-h-[60vh] w-full rounded-md" />
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={m.result_url} download target="_blank" rel="noreferrer">
              <Download className="mr-1 h-3 w-3" /> Baixar
            </a>
          </Button>
        </div>
      </Card>
    );
  }
  return null;
}

function AttachImageButton({ onAttach }: { onAttach: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  return (
    <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            toast.error("Máx 10MB");
            return;
          }
          setUploading(true);
          try {
            const { data: u } = await supabase.auth.getUser();
            const userId = u.user?.id;
            if (!userId) throw new Error("Não autenticado");
            const ext = file.name.split(".").pop() ?? "png";
            const path = `${userId}/${crypto.randomUUID()}.${ext}`;
            const { error } = await supabase.storage.from("chat-attachments").upload(path, file, {
              contentType: file.type,
            });
            if (error) throw error;
            const { data: signed } = await supabase.storage
              .from("chat-attachments")
              .createSignedUrl(path, 60 * 60 * 24 * 7);
            if (!signed?.signedUrl) throw new Error("Falha ao gerar URL");
            onAttach(signed.signedUrl);
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setUploading(false);
            e.target.value = "";
          }
        }}
      />
    </label>
  );
}