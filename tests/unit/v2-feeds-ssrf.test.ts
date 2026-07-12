import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * V2-M3f red line: the intelligence-feed outbound surface reuses the V1.1 SSRF
 * guard. Adding a source or fetching a feed whose URL resolves to an internal /
 * private / cloud-metadata address MUST be rejected — the same protection as the
 * reverse proxy (ADR-015). This is the "new outbound surface = new adversarial
 * tests" requirement.
 */
let vault: string;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-feed-"));
  process.env.CCBILLY_VAULT_DIR = vault;
  fs.mkdirSync(path.join(vault, "config"), { recursive: true });
});
afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
});

describe("feed source SSRF guard (red line)", () => {
  const blocked = [
    "http://127.0.0.1:8003/feed.xml", // loopback
    "http://169.254.169.254/latest/meta-data/", // cloud metadata
    "http://10.0.0.5/rss", // private
    "http://192.168.1.1/rss", // private
    "http://[::1]:1234/feed", // ipv6 loopback
    "http://2130706433/feed", // decimal loopback
  ];

  for (const url of blocked) {
    it(`rejects adding an internal source: ${url}`, async () => {
      const { addFeedSource, SsrfError } = await import(
        "../../src/lib/creator/feed-service"
      );
      await expect(addFeedSource("evil", url)).rejects.toBeInstanceOf(SsrfError);
    });

    it(`rejects fetching an internal feed: ${url}`, async () => {
      const { fetchFeed, SsrfError } = await import(
        "../../src/lib/creator/feed-service"
      );
      await expect(fetchFeed(url)).rejects.toBeInstanceOf(SsrfError);
    });
  }

  it("does NOT persist a source that was rejected", async () => {
    const { addFeedSource, listFeedSources } = await import(
      "../../src/lib/creator/feed-service"
    );
    await expect(
      addFeedSource("evil", "http://127.0.0.1/rss"),
    ).rejects.toThrow();
    expect(listFeedSources()).toEqual([]);
  });

  it("rejects a non-http protocol", async () => {
    const { fetchFeed } = await import("../../src/lib/creator/feed-service");
    await expect(fetchFeed("file:///etc/passwd")).rejects.toThrow();
  });
});

describe("feed source management (allowed public URL)", () => {
  it("persists a public source and lists it", async () => {
    const { addFeedSource, listFeedSources, removeFeedSource } = await import(
      "../../src/lib/creator/feed-service"
    );
    // 1.1.1.1 is a public literal → passes the guard (no DNS)
    const src = await addFeedSource("Cloudflare", "https://1.1.1.1/feed.xml");
    expect(listFeedSources().map((s) => s.title)).toContain("Cloudflare");
    await removeFeedSource(src.id);
    expect(listFeedSources()).toEqual([]);
  });
});
