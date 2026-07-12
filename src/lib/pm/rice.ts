import type { Rice } from "@/lib/schema";

/**
 * RICE score = (reach × impact × confidence) / effort. Higher = higher priority.
 * effort is guarded > 0 to avoid division by zero. Rounded to 1 decimal.
 * See ADR-019.
 */
export function riceScore(rice: Partial<Rice> | null | undefined): number {
  if (!rice) return 0;
  const reach = Number(rice.reach ?? 0);
  const impact = Number(rice.impact ?? 0);
  const confidence = Number(rice.confidence ?? 1);
  const effort = Math.max(0.1, Number(rice.effort ?? 1));
  const raw = (reach * impact * confidence) / effort;
  return Math.round(raw * 10) / 10;
}
