import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Settings2, Paperclip, Download, X } from "lucide-react";
import { sendChatMessage } from "@/lib/chat.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

function ChatView() {
  const { id: conversationId } = Route.useParams();
  const qc = useQueryClient();
  const send = useServerFn(sendChatMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("image");
  const [provider, setProvider] = useState<Provider>("kling");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [attachedUrl, setAttachedUrl] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);

  // Hydrate config from conversation
  useQuery({
    queryKey: ["chat-conv-meta", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_conversations" as never)
        .select("mode,provider")
        .eq("id", conversationId)
        .single();
      const row = data as { mode: Mode; provider: Provider } | null;
      if (row) {
        setMode(row.mode);
        setProvider(row.provider);
      }
      return row;
    },
  });

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
    mutationFn: () =>
      send({
        data: {
          conversationId,
          prompt,
          mode,
          provider,
          durationSeconds: duration,
          aspectRatio: aspect,
          imageUrl: attachedUrl || undefined,
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">
          {mode === "video" ? "🎬 Vídeo" : "🖼️ Imagem"} · {provider}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setShowConfig((s) => !s)}>
          <Settings2 className="h-4 w-4" />
        </Button>
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

      {/* Config panel */}
      {showConfig && (
        <div className="border-t border-border bg-card/30 p-4">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Modo</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Provedor</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kling">Kling</SelectItem>
                  <SelectItem value="xai">xAI Grok</SelectItem>
                  <SelectItem value="sora">OpenAI Sora</SelectItem>
                  <SelectItem value="veo3">Google Veo 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "video" && (
              <>
                <div>
                  <Label className="text-xs">Duração (s)</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Proporção</Label>
                  <Select value={aspect} onValueChange={(v) => setAspect(v as typeof aspect)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <p className="mx-auto mt-3 max-w-3xl text-[11px] text-muted-foreground">
            Multi-cena (&gt;10s), áudio automático e overlay de texto em breve nesta tela.
          </p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card/30 p-4 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (prompt.trim() && !sendMut.isPending) sendMut.mutate();
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
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (prompt.trim() && !sendMut.isPending) sendMut.mutate();
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