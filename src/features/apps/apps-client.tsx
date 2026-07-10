"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Maximize2, Plug, X, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";

interface AppEntry {
  slug: string;
  data: {
    id: string;
    name: string;
    mode: "link" | "iframe" | "proxy";
    url: string;
    icon?: string;
    category?: string;
    status: "enabled" | "disabled";
    order?: number;
    notes?: string;
  };
}

/** Application center (spec §6.7): card grid, three modes, iframe with fallback. */
export function AppsClient() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [embed, setEmbed] = useState<AppEntry | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/apps", { cache: "no-store" });
    const data = await res.json();
    setApps((data.apps ?? []).filter((a: AppEntry) => a.data.status === "enabled"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openApp = (app: AppEntry) => {
    if (app.data.mode === "link") {
      window.open(app.data.url, "_blank", "noopener,noreferrer");
    } else if (app.data.mode === "iframe") {
      setEmbed(app);
    } else {
      // proxy demo: open the proxy endpoint in a new tab
      window.open(`/api/proxy/${app.data.id}`, "_blank", "noopener,noreferrer");
    }
  };

  const MODE_ICON = { link: ExternalLink, iframe: Maximize2, proxy: Plug };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg">应用中心</h1>
        <p className="text-sm text-muted">
          接入的开源应用。增删改在后台管理完成。
        </p>
      </header>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <EmptyState
          kind="apps"
          title="还没有接入的应用"
          description="到后台「应用管理」登记开源应用（link/iframe/proxy），即可在这里上架。"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const ModeIcon = MODE_ICON[app.data.mode];
            return (
              <button
                key={app.slug}
                onClick={() => openApp(app)}
                className="glass glass-hover flex items-center gap-3 p-4 text-left"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[rgb(var(--glass-bg)/0.1)] text-xl">
                  {app.data.icon || "🧩"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-fg">
                    {app.data.name}
                  </div>
                  <div className="text-xs text-muted">{app.data.category}</div>
                </div>
                <ModeIcon size={15} className="shrink-0 text-muted" />
              </button>
            );
          })}
        </div>
      )}

      {embed && <IframeViewer app={embed} onClose={() => setEmbed(null)} />}
    </div>
  );
}

/** Embeds an iframe app; degrades gracefully when embedding is refused. */
function IframeViewer({ app, onClose }: { app: AppEntry; onClose: () => void }) {
  const [status, setStatus] = useState<"checking" | "ok" | "blocked">("checking");
  const [reason, setReason] = useState("");

  useEffect(() => {
    let loaded = false;
    // server-side precheck for X-Frame-Options / CSP
    fetch(`/api/apps/embed-check?url=${encodeURIComponent(app.data.url)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.embeddable) {
          setStatus("blocked");
          setReason(d.reason ?? "对方拒绝被内嵌");
        }
      })
      .catch(() => {});
    // load-timeout fallback: if the iframe hasn't fired onLoad in 8s, assume blocked
    const timer = setTimeout(() => {
      if (!loaded) {
        setStatus((s) => (s === "checking" ? "blocked" : s));
        setReason((r) => r || "加载超时，可能被对方拒绝内嵌");
      }
    }, 8000);
    // mark ok on iframe load
    const onLoad = () => {
      loaded = true;
      setStatus((s) => (s === "blocked" ? s : "ok"));
    };
    (window as unknown as { __ccbillyIframeLoad?: () => void }).__ccbillyIframeLoad =
      onLoad;
    return () => clearTimeout(timer);
  }, [app.data.url]);

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl">{app.data.icon || "🧩"}</span>
        <span className="font-medium text-fg">{app.data.name}</span>
        <a
          href={app.data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-cyan hover:underline"
        >
          在新窗口打开
        </a>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="ml-auto text-muted hover:text-fg"
        >
          <X size={22} />
        </button>
      </div>
      <div className="relative flex-1">
        {status === "blocked" ? (
          <div className="flex h-full items-center justify-center p-6">
            <GlassCard className="max-w-md space-y-3 text-center">
              <AlertTriangle size={28} className="mx-auto text-warning" />
              <h3 className="font-display text-lg text-fg">无法内嵌此应用</h3>
              <p className="text-sm text-muted">{reason}</p>
              <a
                href={app.data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm"
              >
                <ExternalLink size={15} /> 在新窗口打开
              </a>
            </GlassCard>
          </div>
        ) : (
          <iframe
            src={app.data.url}
            title={app.data.name}
            onLoad={() =>
              (
                window as unknown as { __ccbillyIframeLoad?: () => void }
              ).__ccbillyIframeLoad?.()
            }
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
