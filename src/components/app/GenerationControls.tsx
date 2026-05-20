import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { providersFor, getProvider, type MediaKind, type ProviderId } from "@/lib/providers";
import { getApiKey, setApiKey } from "@/lib/api-keys";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  kind: MediaKind;
  value: { provider: ProviderId; model: string; apiKey: string };
  onChange: (v: { provider: ProviderId; model: string; apiKey: string }) => void;
}

export function GenerationControls({ kind, value, onChange }: Props) {
  const options = providersFor(kind);
  const provider = getProvider(value.provider);
  const [showKey, setShowKey] = useState(false);

  // Load saved key whenever provider changes
  useEffect(() => {
    const saved = getApiKey(value.provider);
    if (saved && !value.apiKey) {
      onChange({ ...value, apiKey: saved });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.provider]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Provedor</Label>
        <Select
          value={value.provider}
          onValueChange={(p: ProviderId) => {
            const def = getProvider(p);
            const defaultModel =
              kind === "image" ? def.defaultImageModel ?? "" : def.defaultVideoModel ?? "";
            onChange({ provider: p, model: defaultModel, apiKey: getApiKey(p) });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Modelo</Label>
        <Input
          value={value.model}
          onChange={(e) => onChange({ ...value, model: e.target.value })}
          placeholder={kind === "image" ? provider.imageHint : provider.videoHint}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <div className="flex items-center justify-between">
          <Label>API Key</Label>
          {provider.apiKeyUrl && (
            <a
              href={provider.apiKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Onde pegar <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            type={showKey ? "text" : "password"}
            value={value.apiKey}
            onChange={(e) => {
              onChange({ ...value, apiKey: e.target.value });
              setApiKey(value.provider, e.target.value);
            }}
            placeholder={provider.apiKeyHelp}
            autoComplete="off"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((s) => !s)}>
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sua chave fica salva apenas no navegador (localStorage) — não é enviada nem armazenada no servidor.
        </p>
      </div>
    </div>
  );
}