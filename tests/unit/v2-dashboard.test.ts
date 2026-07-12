import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getLayout, saveLayout } from "../../src/lib/dashboard/layout-service";
import { defaultLayoutFor } from "../../src/lib/dashboard/widgets";
import { addCapture, listCaptures, removeCapture } from "../../src/lib/inbox/inbox-service";

/**
 * V2-M1d: dashboard layout persistence must be per-preset, sanitized (drop
 * unknown widgets, clamp widths, dedupe), and fall back to defaults. Inbox
 * capture is append-only + traversal-safe. See ADR-021 + blueprint B5.1.
 */
let vault: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-dash-"));
  process.env.CCBILLY_VAULT_DIR = vault;
});
afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
});

describe("layout service", () => {
  it("falls back to the preset default when nothing is saved", () => {
    expect(getLayout("pm")).toEqual(defaultLayoutFor("pm"));
    // creator default must include creator widgets, not PM ones
    const creator = getLayout("creator");
    const ids = creator.map((p) => p.id);
    expect(ids).toContain("content-pipeline");
    expect(ids).not.toContain("requirement-queue");
  });

  it("persists a layout per preset and reads it back", async () => {
    await saveLayout("pm", [
      { id: "today-orbit", w: 3 },
      { id: "requirement-queue", w: 2 },
    ]);
    const got = getLayout("pm");
    expect(got).toEqual([
      { id: "today-orbit", w: 3 },
      { id: "requirement-queue", w: 2 },
    ]);
    // a different preset is unaffected
    expect(getLayout("creator")).toEqual(defaultLayoutFor("creator"));
  });

  it("sanitizes: drops unknown widget ids, clamps widths, dedupes", async () => {
    const saved = await saveLayout("both", [
      { id: "today-orbit", w: 99 }, // width not allowed → clamp to default
      { id: "not-a-widget", w: 2 }, // unknown → dropped
      { id: "today-orbit", w: 2 }, // duplicate → dropped
      { id: "heatmap", w: 4 },
    ]);
    expect(saved.map((p) => p.id)).toEqual(["today-orbit", "heatmap"]);
    expect(saved.find((p) => p.id === "today-orbit")!.w).toBe(2); // default
  });
});

describe("inbox capture service", () => {
  it("captures a note into vault/inbox and lists it", async () => {
    await addCapture("写一篇关于 MCP 的文章", "20260101-000000");
    const items = listCaptures();
    expect(items.length).toBe(1);
    expect(items[0].text).toBe("写一篇关于 MCP 的文章");
    expect(fs.existsSync(path.join(vault, "inbox"))).toBe(true);
  });

  it("rejects empty captures", async () => {
    await expect(addCapture("   ", "20260101-000001")).rejects.toThrow();
  });

  it("removeCapture is traversal-safe (a ../ slug does not escape inbox)", async () => {
    // plant a file outside inbox
    const outside = path.join(vault, "secret.md");
    fs.writeFileSync(outside, "secret");
    removeCapture("../secret");
    expect(fs.existsSync(outside)).toBe(true); // untouched
  });

  it("removeCapture deletes a real capture", async () => {
    const item = await addCapture("临时想法", "20260101-000002");
    expect(listCaptures().length).toBe(1);
    removeCapture(item.slug);
    expect(listCaptures().length).toBe(0);
  });
});
