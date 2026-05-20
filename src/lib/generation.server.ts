import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchAsBuffer } from "./fal.server";

export async function uploadToBucket(
  bucket: string,
  path: string,
  buf: ArrayBuffer,
  contentType: string,
) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function bumpSpent(userId: string, amount: number) {
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("total_spent_usd")
    .eq("user_id", userId)
    .maybeSingle();
  const next = Number(prof?.total_spent_usd ?? 0) + amount;
  await supabaseAdmin.from("profiles").update({ total_spent_usd: next }).eq("user_id", userId);
}

export async function bumpProjectCost(projectId: string, amount: number) {
  const { data: p } = await supabaseAdmin
    .from("projects")
    .select("total_cost_usd")
    .eq("id", projectId)
    .maybeSingle();
  const next = Number(p?.total_cost_usd ?? 0) + amount;
  await supabaseAdmin.from("projects").update({ total_cost_usd: next }).eq("id", projectId);
}

export async function insertGeneratedImage(opts: {
  userId: string;
  prompt: string;
  imageUrl: string;
  cost: number;
  status: "ready" | "failed";
  errorMessage?: string;
}) {
  await supabaseAdmin.from("generated_images").insert({
    user_id: opts.userId,
    prompt: opts.prompt,
    image_url: opts.imageUrl,
    model: "flux/schnell",
    cost_usd: opts.cost,
    status: opts.status,
    error_message: opts.errorMessage,
  });
}

// (helper removed — callers use supabaseAdmin directly with typed updates)

export async function generateScript(prompt: string, numScenes: number): Promise<Array<{ prompt: string }>> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const sys = `Você é um roteirista. Divida o tema do usuário em exatamente ${numScenes} cenas visuais curtas. Responda APENAS um JSON: {"scenes":[{"prompt":"descrição visual cinematográfica em inglês, 1-2 frases"}]}. Sem markdown.`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as { scenes: Array<{ prompt: string }> };
  return parsed.scenes.slice(0, numScenes);
}

export { fetchAsBuffer };