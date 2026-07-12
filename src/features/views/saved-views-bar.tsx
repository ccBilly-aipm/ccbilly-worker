"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bookmark, BookmarkPlus, X } from "lucide-react";
import type { SavedView } from "@/lib/views/saved-views";

/**
 * Saved views bar (blueprint B5.3): shows saved filter combos for the current
 * page as chips; "save current" stores the active query string under a name.
 */
export function SavedViewsBar({ page }: { page: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [views, setViews] = useState<SavedView[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const currentQuery = params.toString();

  const load = () => {
    fetch(`/api/views?page=${encodeURIComponent(page)}`)
      .then((r) => r.json())
      .then((d) => setViews(d.views ?? []));
  };
  useEffect(load, [page]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ page, name: name.trim(), query: currentQuery }),
    });
    setName("");
    setNaming(false);
    load();
  };

  const remove = async (id: string) => {
    await fetch("/api/views", {
      method: "DELETE",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const apply = (query: string) => {
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((v) => {
        const active = v.query === currentQuery;
        return (
          <span
            key={v.id}
            className={`group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
              active
                ? "bg-[rgb(var(--aurora-cyan)/0.15)] text-brand-cyan"
                : "bg-[rgb(var(--glass-bg)/0.08)] text-muted hover:text-fg"
            }`}
          >
            <button
              type="button"
              onClick={() => apply(v.query)}
              className="inline-flex items-center gap-1"
            >
              <Bookmark size={11} /> {v.name}
            </button>
            <button
              type="button"
              onClick={() => remove(v.id)}
              aria-label={`删除视图 ${v.name}`}
              className="opacity-0 transition group-hover:opacity-100"
            >
              <X size={11} />
            </button>
          </span>
        );
      })}

      {naming ? (
        <form onSubmit={save} className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="视图名"
            className="input !py-1 !text-xs w-28"
          />
          <button type="submit" className="text-xs text-brand-cyan">
            保存
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted hover:text-fg"
        >
          <BookmarkPlus size={12} /> 保存当前视图
        </button>
      )}
    </div>
  );
}
