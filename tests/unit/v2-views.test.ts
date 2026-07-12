import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addView, listViews, removeView } from "../../src/lib/views/saved-views";

/** V2-M4c: saved views persist per-page filter combos. */
let vault: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-views-"));
  process.env.CCBILLY_VAULT_DIR = vault;
  fs.mkdirSync(path.join(vault, "config"), { recursive: true });
});
afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
});

describe("saved views", () => {
  it("saves and lists a view scoped to a page", async () => {
    await addView("tasks", "进行中的 P0", "status=doing&priority=P0", "a");
    const views = listViews("tasks");
    expect(views.length).toBe(1);
    expect(views[0].name).toBe("进行中的 P0");
    expect(views[0].query).toBe("status=doing&priority=P0");
  });

  it("scopes views by page", async () => {
    await addView("tasks", "T", "status=doing", "a");
    await addView("content", "C", "stage=idea", "b");
    expect(listViews("tasks").map((v) => v.name)).toEqual(["T"]);
    expect(listViews("content").map((v) => v.name)).toEqual(["C"]);
    expect(listViews().length).toBe(2);
  });

  it("strips a leading ? from the query", async () => {
    const v = await addView("tasks", "X", "?status=done", "a");
    expect(v.query).toBe("status=done");
  });

  it("removes a view", async () => {
    const v = await addView("tasks", "X", "status=done", "a");
    await removeView(v.id);
    expect(listViews("tasks")).toEqual([]);
  });

  it("rejects an empty name", async () => {
    await expect(addView("tasks", "  ", "status=done", "a")).rejects.toThrow();
  });
});
