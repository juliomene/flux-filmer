import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, Image as ImageIcon, Loader2, Plus, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils";

type TextOverlay = {
  id: string;
  kind: "text";
  text: string;
  color: string;
  fontSize: number; // % of video height
  x: number; // 0..100
  y: number; // 0..100
  bg: string; // background color or "transparent"
};

type ImageOverlay = {
  id: string;
  kind: "image";
  src: string; // data URL
  width: number; // % of video width
  x: number;
  y: number;
  img?: HTMLImageElement;
};

type Overlay = TextOverlay | ImageOverlay;

const uid = () => Math.random().toString(36).slice(2, 9);

export function VideoOverlayEditor({ src, aspectClass }: { src: string; aspectClass?: string }) {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const selected = overlays.find((o) => o.id === selectedId) || null;

  const update = (id: string, patch: Partial<Overlay>) =>
    setOverlays((prev) => prev.map((o) => (o.id === id ? ({ ...o, ...patch } as Overlay) : o)));

  const remove = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addText = () => {
    const o: TextOverlay = {
      id: uid(),
      kind: "text",
      text: "Seu texto aqui",
      color: "#ffffff",
      fontSize: 6,
      x: 50,
      y: 85,
      bg: "rgba(0,0,0,0.4)",
    };
    setOverlays((p) => [...p, o]);
    setSelectedId(o.id);
  };

  const addImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const o: ImageOverlay = {
          id: uid(),
          kind: "image",
          src,
          width: 25,
          x: 50,
          y: 50,
          img,
        };
        setOverlays((p) => [...p, o]);
        setSelectedId(o.id);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Drag
  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = containerRef.current!.getBoundingClientRect();
    const o = overlays.find((x) => x.id === id)!;
    const cx = (o.x / 100) * rect.width;
    const cy = (o.y / 100) * rect.height;
    dragRef.current = {
      id,
      offsetX: e.clientX - rect.left - cx,
      offsetY: e.clientY - rect.top - cy,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragRef.current.offsetX) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragRef.current.offsetY) / rect.height) * 100;
    update(dragRef.current.id, {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    } as Partial<Overlay>);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const presetPositions = (id: string) => [
    { label: "Topo", x: 50, y: 10 },
    { label: "Centro", x: 50, y: 50 },
    { label: "Base", x: 50, y: 90 },
    { label: "Esq.", x: 12, y: 50 },
    { label: "Dir.", x: 88, y: 50 },
  ].map((p) => (
    <Button key={p.label} variant="outline" size="sm" className="h-7 px-2 text-[11px]"
      onClick={() => update(id, { x: p.x, y: p.y } as Partial<Overlay>)}>
      {p.label}
    </Button>
  ));

  const exportVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (overlays.length === 0) {
      // Just download original
      const a = document.createElement("a");
      a.href = src;
      a.download = "video.mp4";
      a.target = "_blank";
      a.click();
      return;
    }
    setExporting(true);
    setExportProgress(0);
    try {
      // Make sure metadata is loaded
      if (!video.videoWidth) {
        await new Promise<void>((res) => {
          video.addEventListener("loadedmetadata", () => res(), { once: true });
        });
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // Preload images
      const imgMap = new Map<string, HTMLImageElement>();
      for (const o of overlays) {
        if (o.kind === "image") {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.src = o.src;
          await new Promise((res) => {
            if (im.complete) res(null);
            else im.onload = () => res(null);
          });
          imgMap.set(o.id, im);
        }
      }

      const stream = canvas.captureStream(30);
      // Try to attach audio from video
      try {
        const videoStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
        if (videoStream) {
          videoStream.getAudioTracks().forEach((t) => stream.addTrack(t));
        }
      } catch {
        // ignore
      }

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((res) => {
        recorder.onstop = () => res(new Blob(chunks, { type: "video/webm" }));
      });

      // Restart playback from 0
      video.pause();
      video.currentTime = 0;
      await new Promise<void>((res) => {
        video.addEventListener("seeked", () => res(), { once: true });
      });
      const duration = video.duration || 0;

      recorder.start();
      await video.play();

      let raf = 0;
      const draw = () => {
        ctx.drawImage(video, 0, 0, w, h);
        for (const o of overlays) {
          if (o.kind === "text") {
            const fs = (o.fontSize / 100) * h;
            ctx.font = `600 ${fs}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const px = (o.x / 100) * w;
            const py = (o.y / 100) * h;
            const metrics = ctx.measureText(o.text);
            const padX = fs * 0.4;
            const padY = fs * 0.25;
            if (o.bg && o.bg !== "transparent") {
              ctx.fillStyle = o.bg;
              const bw = metrics.width + padX * 2;
              const bh = fs + padY * 2;
              const r = fs * 0.15;
              const bx = px - bw / 2;
              const by = py - bh / 2;
              ctx.beginPath();
              ctx.moveTo(bx + r, by);
              ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
              ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
              ctx.arcTo(bx, by + bh, bx, by, r);
              ctx.arcTo(bx, by, bx + bw, by, r);
              ctx.closePath();
              ctx.fill();
            }
            ctx.fillStyle = o.color;
            ctx.fillText(o.text, px, py);
          } else {
            const im = imgMap.get(o.id);
            if (im) {
              const iw = (o.width / 100) * w;
              const ih = iw * (im.height / im.width);
              ctx.drawImage(im, (o.x / 100) * w - iw / 2, (o.y / 100) * h - ih / 2, iw, ih);
            }
          }
        }
        if (duration) setExportProgress(Math.min(100, (video.currentTime / duration) * 100));
        if (!video.ended && !video.paused) {
          raf = requestAnimationFrame(draw);
        }
      };
      raf = requestAnimationFrame(draw);

      await new Promise<void>((res) => {
        video.addEventListener("ended", () => res(), { once: true });
      });
      cancelAnimationFrame(raf);
      // Final frame
      ctx.drawImage(video, 0, 0, w, h);
      recorder.stop();
      const blob = await done;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video-com-overlays.webm";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Vídeo exportado com overlays.");
    } catch (e) {
      toast.error("Falha ao exportar: " + (e as Error).message);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }, [overlays, src]);

  useEffect(() => {
    return () => {
      dragRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className={cn(
          "relative mx-auto overflow-hidden rounded-md bg-black",
          aspectClass,
        )}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => setSelectedId(null)}
      >
        <video
          ref={videoRef}
          src={src}
          controls
          crossOrigin="anonymous"
          playsInline
          className="block h-full w-full object-contain"
        />
        {overlays.map((o) => (
          <div
            key={o.id}
            onPointerDown={(e) => onPointerDown(e, o.id)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(o.id);
            }}
            className={cn(
              "group absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none touch-none",
              selectedId === o.id && "ring-2 ring-primary ring-offset-1 ring-offset-black/50 rounded",
            )}
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
          >
            {o.kind === "text" ? (
              <span
                style={{
                  color: o.color,
                  background: o.bg,
                  fontSize: `clamp(10px, ${o.fontSize / 100} * 1em * 5, 80px)`,
                  padding: "0.25em 0.5em",
                  borderRadius: "0.25em",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                }}
              >
                {o.text}
              </span>
            ) : (
              <img
                src={o.src}
                alt="overlay"
                draggable={false}
                style={{ width: `${o.width * 4}px`, maxWidth: "60vw" }}
                className="pointer-events-none"
              />
            )}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={addText}>
          <Type className="mr-1 h-3.5 w-3.5" /> Texto
        </Button>
        <label>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addImage(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" asChild>
            <span className="cursor-pointer">
              <ImageIcon className="mr-1 h-3.5 w-3.5" /> Imagem
            </span>
          </Button>
        </label>
        <div className="ml-auto flex items-center gap-2">
          {exporting && (
            <span className="text-[11px] text-muted-foreground">
              Exportando… {exportProgress.toFixed(0)}%
            </span>
          )}
          <Button size="sm" onClick={exportVideo} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
            {overlays.length ? "Baixar com overlays" : "Baixar MP4"}
          </Button>
        </div>
      </div>

      {/* Editor */}
      {selected && (
        <div className="rounded-md border border-border bg-card/60 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">
              {selected.kind === "text" ? "Editar texto" : "Editar imagem"}
            </span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(selected.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>

          {selected.kind === "text" ? (
            <>
              <div className="space-y-1">
                <Label className="text-[11px]">Texto</Label>
                <Input
                  className="h-8 text-sm"
                  value={selected.text}
                  onChange={(e) => update(selected.id, { text: e.target.value } as Partial<Overlay>)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Cor do texto</Label>
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) => update(selected.id, { color: e.target.value } as Partial<Overlay>)}
                    className="h-8 w-full rounded border border-border bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Fundo</Label>
                  <div className="flex gap-1">
                    {[
                      { label: "—", v: "transparent" },
                      { label: "Preto", v: "rgba(0,0,0,0.5)" },
                      { label: "Branco", v: "rgba(255,255,255,0.7)" },
                      { label: "Cor", v: "primary" },
                    ].map((b) => (
                      <Button
                        key={b.label}
                        variant={selected.bg === b.v ? "default" : "outline"}
                        size="sm"
                        className="h-8 flex-1 px-1 text-[10px]"
                        onClick={() =>
                          update(selected.id, {
                            bg: b.v === "primary" ? "hsl(var(--primary))" : b.v,
                          } as Partial<Overlay>)
                        }
                      >
                        {b.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Tamanho: {selected.fontSize}%</Label>
                <Slider
                  min={2}
                  max={20}
                  step={0.5}
                  value={[selected.fontSize]}
                  onValueChange={([v]) => update(selected.id, { fontSize: v } as Partial<Overlay>)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <Label className="text-[11px]">Tamanho: {selected.width}%</Label>
              <Slider
                min={5}
                max={80}
                step={1}
                value={[selected.width]}
                onValueChange={([v]) => update(selected.id, { width: v } as Partial<Overlay>)}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[11px]">Posições rápidas</Label>
            <div className="flex flex-wrap gap-1">{presetPositions(selected.id)}</div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Dica: arraste o elemento sobre o vídeo para posicionar. As alterações só ficam permanentes no arquivo baixado.
          </p>
        </div>
      )}

      {overlays.length === 0 && !selected && (
        <p className="text-center text-[11px] text-muted-foreground">
          <Plus className="mr-1 inline h-3 w-3" />
          Adicione texto ou imagem para sobrepor no vídeo. Arraste para reposicionar.
        </p>
      )}
    </div>
  );
}