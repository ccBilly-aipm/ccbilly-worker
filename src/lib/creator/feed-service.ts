import fs from "node:fs";
import path from "node:path";
import { vaultV2Dir } from "@/lib/config";
import { atomicWriteFile } from "@/lib/vault/atomic";
import { parseDoc, stringifyDoc } from "@/lib/markdown/frontmatter";
import { assertProxyableUrl, SsrfError } from "@/lib/net/ssrf";
import { readSettings } from "@/lib/admin/settings";

/**
 * Intelligence feeds (blueprint B4.6). Feed sources are subscribed RSS/JSON URLs.
 *
 * SECURITY red line: fetching a feed is a NEW outbound network surface, so it
 * reuses the V1.1 SSRF guard (assertProxyableUrl) — the SAME allowlist/IP
 * defense as the reverse proxy. A feed URL resolving to a loopback/private/cloud-
 * metadata address is rejected unless the operator has explicitly enabled
 * internal targets (and metadata is never allowed). See ADR-015 / SECURITY_AUDIT.
 */

const MAX_FEED_BYTES = 2 * 1024 * 1024; // 2MB cap
const FETCH_TIMEOUT_MS = 8000;

export interface FeedSource {
  id: string;
  title: string;
  url: string;
}

export interface FeedArticle {
  title: string;
  link: string;
  date: string;
}

function feedsPath(): string {
  return path.join(vaultV2Dir("config"), "feeds.md");
}

export function listFeedSources(): FeedSource[] {
  try {
    const { data } = parseDoc(fs.readFileSync(feedsPath(), "utf8"));
    const sources = (data as Record<string, unknown>).sources;
    return Array.isArray(sources) ? (sources as FeedSource[]) : [];
  } catch {
    return [];
  }
}

export async function addFeedSource(title: string, url: string): Promise<FeedSource> {
  // validate the URL is proxyable BEFORE storing it, so we never persist a
  // source pointing at an internal address.
  const allowInternal = readSettings().allowInternalProxyTargets;
  await assertProxyableUrl(url, allowInternal);

  const sources = listFeedSources();
  const id = `feed-${sources.length + 1}-${Date.now().toString(36)}`;
  const next = [...sources, { id, title: title.trim() || url, url }];
  fs.mkdirSync(vaultV2Dir("config"), { recursive: true });
  await atomicWriteFile(
    feedsPath(),
    stringifyDoc({ type: "config", config: "feeds", sources: next }, "# 情报源\n"),
  );
  return next[next.length - 1];
}

export async function removeFeedSource(id: string): Promise<void> {
  const next = listFeedSources().filter((s) => s.id !== id);
  fs.mkdirSync(vaultV2Dir("config"), { recursive: true });
  await atomicWriteFile(
    feedsPath(),
    stringifyDoc({ type: "config", config: "feeds", sources: next }, "# 情报源\n"),
  );
}

/** Very small RSS/Atom title+link extractor (no XML dep). */
function parseRss(xml: string): FeedArticle[] {
  const items: FeedArticle[] = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  for (const block of blocks.slice(0, 30)) {
    const title =
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "(无标题)";
    // RSS uses <link>url</link>; Atom uses <link href="url"/>
    const link =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ||
      block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ||
      "";
    const date =
      block.match(/<(pubDate|updated|published)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] ?? "";
    items.push({
      title: decodeXml(stripCdata(title)).trim(),
      link: link.trim(),
      date: date.trim(),
    });
  }
  return items;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseJsonFeed(text: string): FeedArticle[] {
  try {
    const obj = JSON.parse(text);
    const items = Array.isArray(obj.items) ? obj.items : [];
    return items.slice(0, 30).map((it: Record<string, unknown>) => ({
      title: String(it.title ?? "(无标题)"),
      link: String(it.url ?? it.external_url ?? ""),
      date: String(it.date_published ?? it.date_modified ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch + parse a feed URL. Passes the SSRF guard first (red line), enforces a
 * size cap and timeout, and never follows redirects to a new (unchecked) host.
 */
export async function fetchFeed(url: string): Promise<FeedArticle[]> {
  const allowInternal = readSettings().allowInternalProxyTargets;
  await assertProxyableUrl(url, allowInternal); // throws SsrfError if blocked

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "manual", // don't follow into an unchecked host
      signal: controller.signal,
      headers: { accept: "application/rss+xml, application/json, text/xml, */*" },
    });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FEED_BYTES) throw new Error("订阅源响应过大");
    const text = new TextDecoder().decode(buf);
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("json") || text.trimStart().startsWith("{")) {
      return parseJsonFeed(text);
    }
    return parseRss(text);
  } finally {
    clearTimeout(timer);
  }
}

export { SsrfError };
