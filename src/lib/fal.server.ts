// fal.ai REST helpers — only used inside server functions.

const QUEUE_BASE = "https://queue.fal.run";
const SYNC_BASE = "https://fal.run";

function authHeaders() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
}

export async function falRun<T>(model: string, input: unknown): Promise<T> {
  const res = await fetch(`${SYNC_BASE}/${model}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fal.run ${model} ${res.status}: ${txt.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

export async function falSubmit(model: string, input: unknown): Promise<string> {
  const res = await fetch(`${QUEUE_BASE}/${model}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fal.submit ${model} ${res.status}: ${txt.slice(0, 500)}`);
  }
  const data = (await res.json()) as { request_id: string };
  return data.request_id;
}

export type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export async function falStatus(model: string, requestId: string): Promise<{
  status: FalStatus;
  logs?: unknown;
}> {
  const res = await fetch(`${QUEUE_BASE}/${model}/requests/${requestId}/status`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`fal.status ${res.status}`);
  return (await res.json()) as { status: FalStatus };
}

export async function falResult<T>(model: string, requestId: string): Promise<T> {
  const res = await fetch(`${QUEUE_BASE}/${model}/requests/${requestId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`fal.result ${res.status}`);
  return (await res.json()) as T;
}

// Upload a remote URL to Supabase storage via fetch+arrayBuffer
export async function fetchAsBuffer(url: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${url} ${r.status}`);
  return {
    data: await r.arrayBuffer(),
    contentType: r.headers.get("content-type") ?? "application/octet-stream",
  };
}