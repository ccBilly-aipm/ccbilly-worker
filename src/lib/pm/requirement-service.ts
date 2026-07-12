import path from "node:path";
import fs from "node:fs";
import { vaultTypeDir } from "@/lib/config";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { indexFile } from "@/lib/index/indexer";
import { getBySlug } from "@/lib/index/queries";
import type { EntryView } from "@/lib/index/queries";
import { RequirementStage, type Rice } from "@/lib/schema";

/**
 * PM requirement operations (blueprint B3.1). Requirements are tasks with
 * kind=requirement; here we update their RICE scores and pipeline stage
 * (inbox → pool → scheduled → shipped). Reuses the vault read/write path so all
 * writes stay atomic and zod-validated on reindex.
 */

const STAGES = RequirementStage.options;

function reqPath(slug: string): string {
  return path.join(vaultTypeDir("task"), `${slug}.md`);
}

/** Update RICE fields on a requirement. */
export async function updateRice(
  slug: string,
  rice: Partial<Rice>,
): Promise<EntryView> {
  const filePath = reqPath(slug);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseDoc(raw);
  const d = data as Record<string, unknown>;
  const prev = (d.rice as Rice) ?? { reach: 0, impact: 0, confidence: 1, effort: 1 };
  d.rice = { ...prev, ...rice };
  d.kind = "requirement";
  await atomicWriteFile(filePath, stringifyDoc(d, content));
  await indexFile(filePath, "task");
  return getBySlug("task", slug)!;
}

/** Move a requirement to a new pipeline stage. */
export async function updateStage(
  slug: string,
  stage: string,
): Promise<EntryView> {
  if (!STAGES.includes(stage as (typeof STAGES)[number])) {
    throw new Error(`未知的需求阶段：${stage}`);
  }
  const filePath = reqPath(slug);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseDoc(raw);
  const d = data as Record<string, unknown>;
  d.stage = stage;
  d.kind = "requirement";
  await atomicWriteFile(filePath, stringifyDoc(d, content));
  await indexFile(filePath, "task");
  return getBySlug("task", slug)!;
}
