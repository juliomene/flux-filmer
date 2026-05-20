import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export function InputImagePicker({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const path = `${user.id}/inputs/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("images").upload(path, file, { upsert: false });
      if (error) throw error;
      const url = supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
      onChange(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Imagem de entrada (opcional)</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          className="flex-1 min-w-[200px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cole uma URL ou envie um arquivo"
        />
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button asChild variant="outline" type="button" disabled={uploading}>
            <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar arquivo"}</span>
          </Button>
        </label>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={value} alt="entrada" className="mt-2 max-h-48 rounded-md border border-border object-contain" />
      )}
    </div>
  );
}