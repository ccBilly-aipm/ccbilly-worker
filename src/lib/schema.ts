import { z } from "zod";

/**
 * Frontmatter schemas for all vault entry types (spec §5).
 * Rules:
 * - `.passthrough()` on every schema so unknown fields survive a read→write
 *   round-trip (spec §5: "写回文件时保留未知字段").
 * - Parse failures do NOT throw at the app boundary; callers route bad files to
 *   the repair list (HANDBOOK ADR-005).
 */

/**
 * ISO datetime that tolerates YAML's native Date parsing. gray-matter turns
 * `2026-07-10T10:00:00+09:00` into a JS Date, so we coerce Date → ISO string and
 * validate string inputs. Always normalizes to a string for write-back.
 */
const isoDateTime = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString() : v))
  .refine((s) => !Number.isNaN(Date.parse(s)), "invalid ISO datetime");

/**
 * A YYYY-MM-DD date field. YAML may parse `2026-07-15` into a Date (UTC
 * midnight); normalize back to a local YYYY-MM-DD string for write-back.
 */
function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const dateOnly = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? toDateKey(v) : v))
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s), "expected YYYY-MM-DD");

// ---- Task ----
export const TaskStatus = z.enum(["todo", "doing", "blocked", "done", "archived"]);
export const Priority = z.enum(["P0", "P1", "P2", "P3"]);

/**
 * V2 (ADR-019): a `type:task` entry may carry an optional `kind` discriminant to
 * become a PM requirement or a creator content item, reusing the whole task
 * pipeline (board/activity/index/atomic write). All V2 fields are OPTIONAL, so
 * old task files stay valid unchanged (backward-compat red line). `.passthrough()`
 * preserves them on round-trip.
 */
export const TaskKind = z.enum(["task", "requirement", "content"]);

// PM requirement extras
export const RiceScore = z
  .object({
    reach: z.number().min(0).default(0),
    impact: z.number().min(0).default(0),
    confidence: z.number().min(0).max(1).default(1),
    effort: z.number().min(0.1).default(1),
  })
  .passthrough();
export const RequirementStage = z.enum(["inbox", "pool", "scheduled", "shipped"]);

// Creator content extras
export const ContentStage = z.enum([
  "idea",
  "draft",
  "ready",
  "published",
  "review",
]);
export const MetricSnapshot = z
  .object({
    date: dateOnly,
    platform: z.string(),
    views: z.number().int().min(0).optional().default(0),
    likes: z.number().int().min(0).optional().default(0),
    comments: z.number().int().min(0).optional().default(0),
    shares: z.number().int().min(0).optional().default(0),
    followers_gained: z.number().int().optional().default(0),
  })
  .passthrough();

export const TaskFrontmatter = z
  .object({
    id: z.string().min(1),
    type: z.literal("task"),
    title: z.string().min(1),
    status: TaskStatus.default("todo"),
    priority: Priority.default("P2"),
    collection: z.string().optional().nullable(),
    tags: z.array(z.string()).default([]),
    progress: z.number().int().min(0).max(100).default(0),
    due: dateOnly.optional().nullable(),
    created: isoDateTime,
    updated: isoDateTime,
    // ---- V2 optional fields (ADR-019); absent = plain task ----
    kind: TaskKind.optional(),
    // requirement (PM)
    rice: RiceScore.optional(),
    // content (creator)
    platforms: z.array(z.string()).optional(),
    publish_date: dateOnly.optional().nullable(),
    metrics: z.array(MetricSnapshot).optional(),
    // shared: requirement uses RequirementStage, content uses ContentStage; kept
    // as a loose string so both validate (stage semantics enforced in services).
    stage: z.string().optional(),
  })
  .passthrough();

// ---- Collection ----
export const CollectionStatus = z.enum(["active", "archived"]);

/** V2: a collection with a start/end cycle becomes a burndown-capable sprint. */
export const Cycle = z
  .object({
    start: dateOnly,
    end: dateOnly,
  })
  .passthrough();

export const CollectionFrontmatter = z
  .object({
    id: z.string().min(1),
    type: z.literal("collection"),
    title: z.string().min(1),
    status: CollectionStatus.default("active"),
    description: z.string().optional().default(""),
    created: isoDateTime,
    updated: isoDateTime,
    // V2 optional: gives the collection a burndown chart (ADR-019)
    cycle: Cycle.optional().nullable(),
  })
  .passthrough();

// ---- Daily report ----
export const ReportStatus = z.enum(["draft", "final"]);

export const DailyFrontmatter = z
  .object({
    date: dateOnly,
    type: z.literal("daily"),
    status: ReportStatus.default("draft"),
    generated_at: isoDateTime.optional(),
  })
  .passthrough();

// ---- Weekly report ----
export const WeeklyFrontmatter = z
  .object({
    week: z.string().regex(/^\d{4}-W\d{2}$/, "expected YYYY-Www"),
    type: z.literal("weekly"),
    status: ReportStatus.default("draft"),
    range: z.string().optional(),
    generated_at: isoDateTime.optional(),
  })
  .passthrough();

// ---- Skill (personal skill tree) ----
export const SkillLevelStatus = z.enum([
  "learning",
  "using",
  "mastered",
  "paused",
]);

export const SkillFrontmatter = z
  .object({
    id: z.string().min(1),
    type: z.literal("skill"),
    name: z.string().min(1),
    category: z.string().min(1),
    level: z.number().int().min(1).max(5).default(1),
    target_level: z.number().int().min(1).max(5).default(5),
    status: SkillLevelStatus.default("learning"),
    tags: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    created: isoDateTime.optional(),
    updated: isoDateTime.optional(),
  })
  .passthrough();

// ---- App registry ----
export const AppMode = z.enum(["link", "iframe", "proxy"]);
export const AppStatus = z.enum(["enabled", "disabled"]);

export const AppFrontmatter = z
  .object({
    id: z.string().min(1),
    type: z.literal("app"),
    name: z.string().min(1),
    mode: AppMode.default("link"),
    url: z.string().min(1),
    icon: z.string().optional().default(""),
    category: z.string().optional().default("其他"),
    status: AppStatus.default("enabled"),
    order: z.number().int().default(0),
    notes: z.string().optional().default(""),
    // proxy mode extras (optional)
    proxyBaseUrl: z.string().optional(),
    proxyHeaders: z.record(z.string()).optional(),
    created: isoDateTime.optional(),
    updated: isoDateTime.optional(),
  })
  .passthrough();

// ---- Knowledge note (minimal: just needs a title fallback) ----
export const KnowledgeFrontmatter = z
  .object({
    id: z.string().optional(),
    type: z.literal("knowledge").optional(),
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    created: isoDateTime.optional(),
    updated: isoDateTime.optional(),
  })
  .passthrough();

export type Task = z.infer<typeof TaskFrontmatter>;
export type Collection = z.infer<typeof CollectionFrontmatter>;
export type Rice = z.infer<typeof RiceScore>;
export type Metric = z.infer<typeof MetricSnapshot>;
export type CycleT = z.infer<typeof Cycle>;
export type Daily = z.infer<typeof DailyFrontmatter>;
export type Weekly = z.infer<typeof WeeklyFrontmatter>;
export type Skill = z.infer<typeof SkillFrontmatter>;
export type App = z.infer<typeof AppFrontmatter>;
export type Knowledge = z.infer<typeof KnowledgeFrontmatter>;

export const SCHEMA_BY_TYPE = {
  task: TaskFrontmatter,
  collection: CollectionFrontmatter,
  daily: DailyFrontmatter,
  weekly: WeeklyFrontmatter,
  skill: SkillFrontmatter,
  app: AppFrontmatter,
  knowledge: KnowledgeFrontmatter,
} as const;

export type EntryType = keyof typeof SCHEMA_BY_TYPE;
