import fs from "node:fs";
import path from "node:path";
import { vaultV2Dir } from "@/lib/config";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { localISO, localDateKey } from "@/lib/utils/date";

/**
 * Decision log (blueprint B3.4). ADR-style records in vault/decisions/ with a
 * fixed template (背景/选项/决定/理由/复盘时间). A review_date drives an
 * "up-for-review" reminder. Append-only + traversal-safe.
 */

export interface Decision {
  slug: string;
  title: string;
  status: string;
  created: string;
  reviewDate: string | null;
  filePath: string;
}

function dir(): string {
  return vaultV2Dir("decisions");
}

function slugify(title: string, stamp: string): string {
  const head = title
    .slice(0, 28)
    .replace(/[\\/:*?"<>|#[\]]/g, "")
    .replace(/\s+/g, "-")
    .trim();
  return `${stamp}-${head || "decision"}`;
}

const TEMPLATE = (title: string) =>
  [
    `# ${title}`,
    "",
    "## 背景",
    "（我们面对什么问题 / 处境）",
    "",
    "## 选项",
    "- 选项 A：",
    "- 选项 B：",
    "",
    "## 决定",
    "（我们决定做什么）",
    "",
    "## 理由",
    "（为什么这样选，权衡了什么）",
    "",
    "## 复盘",
    "（到复盘时间回来记录：这个决定后来对不对）",
    "",
  ].join("\n");

export async function createDecision(
  title: string,
  stamp: string,
  reviewDate?: string | null,
): Promise<Decision> {
  const clean = title.trim();
  if (!clean) throw new Error("决策标题不能为空");
  fs.mkdirSync(dir(), { recursive: true });
  const slug = slugify(clean, stamp);
  const filePath = path.join(dir(), `${slug}.md`);
  const created = localISO();
  await atomicWriteFile(
    filePath,
    stringifyDoc(
      {
        type: "decision",
        title: clean,
        status: "open",
        created,
        review_date: reviewDate ?? null,
      },
      TEMPLATE(clean),
    ),
  );
  return { slug, title: clean, status: "open", created, reviewDate: reviewDate ?? null, filePath };
}

export function listDecisions(): Decision[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir()).filter((n) => n.endsWith(".md") && !n.startsWith("."));
  } catch {
    return [];
  }
  const items: Decision[] = [];
  for (const name of names) {
    const filePath = path.join(dir(), name);
    try {
      const { data } = parseDoc(fs.readFileSync(filePath, "utf8"));
      const d = data as Record<string, unknown>;
      items.push({
        slug: name.replace(/\.md$/, ""),
        title: String(d.title ?? name.replace(/\.md$/, "")),
        status: String(d.status ?? "open"),
        created: String(d.created ?? ""),
        reviewDate: (d.review_date as string) ?? null,
        filePath,
      });
    } catch {
      /* skip */
    }
  }
  return items.sort((a, b) => b.created.localeCompare(a.created));
}

/** Decisions whose review date is today or past (due for review). */
export function decisionsDueForReview(): Decision[] {
  const today = localDateKey(new Date());
  return listDecisions().filter(
    (d) => d.reviewDate && d.reviewDate <= today && d.status !== "reviewed",
  );
}
