import fs from "node:fs";
import path from "node:path";
import { vaultV2Dir } from "@/lib/config";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import {
  defaultLayoutFor,
  isWidgetId,
  WIDGETS,
  type WidgetId,
} from "@/lib/dashboard/widgets";
import type { PresetId } from "@/lib/preset/presets";

/**
 * Dashboard layout persistence (ADR-021). Stored in vault/config/dashboard.md;
 * frontmatter keeps a per-preset map of ordered {id, w} entries. Reading is
 * fail-safe (falls back to the preset default). Writes are sanitized: unknown
 * widget ids are dropped and widths are clamped to each widget's allowed set.
 */

export interface WidgetPlacement {
  id: WidgetId;
  w: number;
}

type LayoutMap = Partial<Record<PresetId, WidgetPlacement[]>>;

function layoutPath(): string {
  return path.join(vaultV2Dir("config"), "dashboard.md");
}

function readAll(): LayoutMap {
  try {
    const raw = fs.readFileSync(layoutPath(), "utf8");
    const { data } = parseDoc(raw);
    const layouts = (data as Record<string, unknown>).layouts;
    return (layouts as LayoutMap) ?? {};
  } catch {
    return {};
  }
}

/** Sanitize a placement list: keep known widgets, clamp widths to allowed set. */
function sanitize(list: unknown): WidgetPlacement[] | null {
  if (!Array.isArray(list)) return null;
  const seen = new Set<WidgetId>();
  const out: WidgetPlacement[] = [];
  for (const item of list) {
    const id = (item as { id?: unknown })?.id;
    if (!isWidgetId(id) || seen.has(id)) continue;
    seen.add(id);
    const def = WIDGETS[id];
    const wRaw = Number((item as { w?: unknown }).w);
    const w = def.widths.includes(wRaw as 1 | 2 | 3 | 4) ? wRaw : def.defaultW;
    out.push({ id, w });
  }
  return out.length ? out : null;
}

/** Get the layout for a preset — persisted (sanitized) or the default. */
export function getLayout(preset: PresetId): WidgetPlacement[] {
  const stored = sanitize(readAll()[preset]);
  return stored ?? defaultLayoutFor(preset);
}

/** Persist a layout for a preset. Returns the sanitized layout actually saved. */
export async function saveLayout(
  preset: PresetId,
  list: unknown,
): Promise<WidgetPlacement[]> {
  const clean = sanitize(list) ?? defaultLayoutFor(preset);
  const all = readAll();
  all[preset] = clean;
  fs.mkdirSync(vaultV2Dir("config"), { recursive: true });
  const body =
    "# 仪表盘布局\n\n拖拽仪表盘上的卡片可调整顺序与宽度，布局按角色预设分别保存于此。\n";
  await atomicWriteFile(
    layoutPath(),
    stringifyDoc({ type: "config", config: "dashboard", layouts: all }, body),
  );
  return clean;
}
