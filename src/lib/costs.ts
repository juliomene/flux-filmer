// Custos em USD por unidade. Fontes: tabela pública fal.ai (out/2025).
export const COSTS = {
  flux_schnell_per_image: 0.003,
  kling_v16_standard_per_second: 0.05,
} as const;

export function imageCost(): number {
  return COSTS.flux_schnell_per_image;
}

export function videoCost(durationSeconds: number): number {
  return Number((COSTS.kling_v16_standard_per_second * durationSeconds).toFixed(4));
}

export function formatUsd(value: number | null | undefined): string {
  const v = Number(value ?? 0);
  if (v === 0) return "$0,00";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}