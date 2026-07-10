import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  VAULT_SUBDIRS,
  vaultDir,
  vaultTypeDir,
  type VaultEntryType,
} from "@/lib/config";
import { SCHEMA_BY_TYPE, type EntryType } from "@/lib/schema";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import {
  atomicWriteFile,
  fileExists,
  listMarkdownFiles,
  listMarkdownFilesRecursive,
  readFileUtf8,
} from "@/lib/vault/atomic";
import type { BrokenEntry, ScanResult, VaultEntry } from "@/lib/vault/types";

/**
 * The vault repository: the ONLY place that reads/writes .md business data.
 * Write path (ADR-004): zod validate → atomic write → (caller updates index).
 * Read path routes parse/schema failures into `broken` instead of throwing.
 */

const TYPED_SUBDIRS: EntryType[] = [
  "task",
  "collection",
  "daily",
  "weekly",
  "skill",
  "app",
];

function inferTypeFromDir(filePath: string): EntryType | "knowledge" | "unknown" {
  const rel = path.relative(vaultDir(), filePath);
  for (const [type, sub] of Object.entries(VAULT_SUBDIRS)) {
    if (rel === sub || rel.startsWith(sub + path.sep)) {
      return type as EntryType | "knowledge";
    }
  }
  return "unknown";
}

async function statMtime(filePath: string): Promise<number> {
  try {
    return (await fs.promises.stat(filePath)).mtimeMs;
  } catch {
    return 0;
  }
}

/** Read + validate a single file. Returns either an entry or a broken record. */
export async function readEntry(
  filePath: string,
  typeHint?: EntryType,
): Promise<{ entry?: VaultEntry; broken?: BrokenEntry }> {
  const type = (typeHint ?? inferTypeFromDir(filePath)) as EntryType | "unknown";
  const slug = path.basename(filePath, ".md");
  const mtimeMs = await statMtime(filePath);

  let raw: string;
  try {
    raw = await readFileUtf8(filePath);
  } catch (err) {
    return {
      broken: {
        filePath,
        slug,
        type: type as BrokenEntry["type"],
        error: `无法读取文件：${(err as Error).message}`,
        mtimeMs,
      },
    };
  }

  let parsed;
  try {
    parsed = parseDoc(raw);
  } catch (err) {
    return {
      broken: {
        filePath,
        slug,
        type: type as BrokenEntry["type"],
        error: `frontmatter 解析失败：${(err as Error).message}`,
        mtimeMs,
      },
    };
  }

  if (type === "unknown") {
    return {
      broken: {
        filePath,
        slug,
        type: "unknown",
        error: "无法根据目录判断条目类型",
        mtimeMs,
      },
    };
  }

  const schema = SCHEMA_BY_TYPE[type];
  const result = schema.safeParse(parsed.data);
  if (!result.success) {
    return {
      broken: {
        filePath,
        slug,
        type,
        error: formatZodError(result.error),
        mtimeMs,
      },
    };
  }

  return {
    entry: {
      filePath,
      slug,
      type,
      data: result.data,
      content: parsed.content,
      mtimeMs,
    },
  };
}

function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/** Scan one type's directory. */
export async function scanType(type: EntryType): Promise<ScanResult> {
  const dir = vaultTypeDir(type as VaultEntryType);
  const files = await listMarkdownFiles(dir);
  return partition(files, type);
}

/** Knowledge notes live in a recursive tree (Obsidian's main battleground). */
export async function scanKnowledge(): Promise<ScanResult> {
  const dir = vaultTypeDir("knowledge" as VaultEntryType);
  const files = await listMarkdownFilesRecursive(dir);
  return partition(files, "knowledge");
}

async function partition(files: string[], type: EntryType): Promise<ScanResult> {
  const entries: VaultEntry[] = [];
  const broken: BrokenEntry[] = [];
  for (const f of files) {
    const { entry, broken: b } = await readEntry(f, type);
    if (entry) entries.push(entry);
    if (b) broken.push(b);
  }
  return { entries, broken };
}

/** Full vault scan across all typed dirs + knowledge tree. */
export async function scanAll(): Promise<ScanResult> {
  const all: ScanResult = { entries: [], broken: [] };
  for (const type of TYPED_SUBDIRS) {
    const r = await scanType(type);
    all.entries.push(...r.entries);
    all.broken.push(...r.broken);
  }
  const k = await scanKnowledge();
  all.entries.push(...k.entries);
  all.broken.push(...k.broken);
  return all;
}

export interface WriteEntryInput {
  type: EntryType;
  filePath: string; // absolute
  data: Record<string, unknown>;
  content: string;
}

/**
 * Validate + atomically write an entry.
 * Preserves unknown frontmatter fields because the schemas use .passthrough()
 * and we write back the validated (merged) object.
 */
export async function writeEntry(input: WriteEntryInput): Promise<VaultEntry> {
  const schema = SCHEMA_BY_TYPE[input.type];
  const validated = schema.parse(input.data); // throws on invalid → caller handles
  const raw = stringifyDoc(validated as Record<string, unknown>, input.content);
  await atomicWriteFile(input.filePath, raw);
  const mtimeMs = await statMtime(input.filePath);
  return {
    filePath: input.filePath,
    slug: path.basename(input.filePath, ".md"),
    type: input.type,
    data: validated as Record<string, unknown>,
    content: input.content,
    mtimeMs,
  };
}

/** Move an entry file to vault trash (never hard-delete business data). */
export async function trashEntry(filePath: string): Promise<string> {
  const trashDir = path.join(vaultDir(), ".trash", String(Date.now()));
  await fs.promises.mkdir(trashDir, { recursive: true });
  const dest = path.join(trashDir, path.basename(filePath));
  await fs.promises.rename(filePath, dest);
  return dest;
}

export async function entryExists(filePath: string): Promise<boolean> {
  return fileExists(filePath);
}
