import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { localISO } from "../../src/lib/utils/date";

/** Personal skill-tree service over a throwaway vault (spec §6.5 Tab B). */
let tmp: string;
let cacheTmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-st-"));
  cacheTmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-stcache-"));
  process.env.CCBILLY_VAULT_DIR = tmp;
  process.env.CCBILLY_CACHE_DIR = cacheTmp;
});

afterEach(async () => {
  const { closeDb } = await import("../../src/lib/index/db");
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(cacheTmp, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
  delete process.env.CCBILLY_CACHE_DIR;
});

async function seedSkill(name: string, category: string, level: number) {
  const { writeEntry } = await import("../../src/lib/vault/repo");
  const { vaultTypeDir } = await import("../../src/lib/config");
  await writeEntry({
    type: "skill",
    filePath: path.join(vaultTypeDir("skill"), `${name}.md`),
    data: {
      id: `skill-${name}`,
      type: "skill",
      name,
      category,
      level,
      target_level: 5,
      status: "learning",
      tags: [],
      related: [],
      created: localISO(),
      updated: localISO(),
    },
    content: "## 学习记录\n- 2026-07-10 · 起步\n\n## 资源\n- ",
  });
}

describe("skill matrix + radar", () => {
  it("groups by category and averages level", async () => {
    const { rebuildIndex } = await import("../../src/lib/index/indexer");
    await seedSkill("Next", "前端", 4);
    await seedSkill("TS", "前端", 2);
    await seedSkill("RAG", "AI", 3);
    await rebuildIndex();
    const { skillMatrix } = await import("../../src/lib/vault/skill-tree-service");
    const m = skillMatrix();
    const frontend = m.radar.find((r) => r.category === "前端")!;
    expect(frontend.avgLevel).toBe(3); // (4+2)/2
    expect(m.categories.find((c) => c.category === "AI")?.skills).toHaveLength(1);
  });

  it("appendLearningLog adds a dated line to 学习记录", async () => {
    const { rebuildIndex } = await import("../../src/lib/index/indexer");
    await seedSkill("Radar", "AI", 3);
    await rebuildIndex();
    const { appendLearningLog } = await import(
      "../../src/lib/vault/skill-tree-service"
    );
    const { getSection } = await import("../../src/lib/markdown/sections");
    const updated = await appendLearningLog("Radar", "学了雷达图");
    expect(getSection(updated.content, "学习记录")).toContain("学了雷达图");
  });

  it("updateSkill changes level/target/status", async () => {
    const { rebuildIndex } = await import("../../src/lib/index/indexer");
    await seedSkill("Upd", "AI", 2);
    await rebuildIndex();
    const { updateSkill } = await import(
      "../../src/lib/vault/skill-tree-service"
    );
    const updated = await updateSkill("Upd", { level: 4, status: "using" });
    expect(updated.data.level).toBe(4);
    expect(updated.data.status).toBe("using");
  });
});
