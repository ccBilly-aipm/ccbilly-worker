"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Plus, Rss, Trash2, Lightbulb, ExternalLink, RefreshCw } from "lucide-react";
import type { FeedSource, FeedArticle } from "@/lib/creator/feed-service";

/**
 * Intelligence feeds (blueprint B4.6). Add allowlist-safe RSS/JSON sources
 * (internal/private URLs are rejected by the SSRF guard), fetch articles, and
 * "save as idea" into the 选题库.
 */
export function FeedsClient({ sources }: { sources: FeedSource[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Record<string, FeedArticle[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ title, url }),
    });
    if (res.ok) {
      setTitle("");
      setUrl("");
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.detail || d.error || "添加失败");
    }
  };

  const removeSource = async (id: string) => {
    await fetch("/api/feeds", {
      method: "DELETE",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  };

  const loadFeed = async (source: FeedSource) => {
    setLoading(source.id);
    try {
      const res = await fetch("/api/feeds/fetch", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ url: source.url }),
      });
      const d = await res.json();
      setArticles((prev) => ({ ...prev, [source.id]: d.articles ?? [] }));
    } finally {
      setLoading(null);
    }
  };

  const saveAsIdea = async (a: FeedArticle) => {
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ title: a.title, sourceUrl: a.link || undefined, heat: 3 }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-fg">情报源</h1>
      </div>

      <GlassCard className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted">
          <Plus size={14} /> 添加订阅源（RSS / JSON）
        </h2>
        <form onSubmit={addSource} className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="名称（可选）"
            className="input w-40"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="input flex-1"
            required
          />
          <button type="submit" className="glass glass-hover rounded-lg px-4 text-sm text-fg">
            添加
          </button>
        </form>
        {error && <p className="text-xs text-danger">{error}</p>}
        <p className="text-[11px] text-muted">
          只允许经安全策略放行的公网地址；内网 / 本机地址会被拒绝。推荐搭配
          wewe-rss / we-mp-rss 把竞品公众号变成源。
        </p>
      </GlassCard>

      {sources.length === 0 ? (
        <GlassCard>
          <p className="py-6 text-center text-sm text-muted">
            还没有订阅源。添加一个 RSS/JSON 地址开始你的「早晨一览」。
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <GlassCard key={s.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Rss size={15} className="shrink-0 text-brand-cyan" />
                  <span className="truncate font-medium text-fg">{s.title}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => loadFeed(s)}
                    disabled={loading === s.id}
                    aria-label={`刷新 ${s.title}`}
                    className="rounded p-1.5 text-muted hover:text-brand-cyan disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loading === s.id ? "animate-spin" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSource(s.id)}
                    aria-label={`删除 ${s.title}`}
                    className="rounded p-1.5 text-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {articles[s.id] && (
                <ul className="space-y-1">
                  {articles[s.id].length === 0 ? (
                    <li className="text-xs text-muted">（未解析到文章）</li>
                  ) : (
                    articles[s.id].map((a, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-[rgb(var(--glass-bg)/0.06)]"
                      >
                        <span className="min-w-0 flex-1 truncate text-fg">{a.title}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          {a.link && (
                            <a
                              href={a.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted hover:text-brand-cyan"
                              aria-label="打开原文"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => saveAsIdea(a)}
                            title="存为选题"
                            aria-label="存为选题"
                            className="text-muted hover:text-warning"
                          >
                            <Lightbulb size={13} />
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
