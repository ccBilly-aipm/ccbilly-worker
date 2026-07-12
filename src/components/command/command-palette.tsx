"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCommandPalette } from "@/components/command/command-store";
import {
  ListTodo,
  FileText,
  CalendarRange,
  Sparkles,
  BookOpen,
  AppWindow,
  Plus,
  RefreshCw,
  SunMoon,
  Inbox,
  Target,
  Lightbulb,
  Rss,
  LayoutDashboard,
} from "lucide-react";

interface SearchItem {
  id: string;
  type: string;
  title: string;
  href: string;
}

const TYPE_ICON: Record<string, typeof ListTodo> = {
  task: ListTodo,
  daily: FileText,
  weekly: CalendarRange,
  skill: Sparkles,
  knowledge: BookOpen,
  app: AppWindow,
};

/** Global command palette (spec §6.9): fuzzy search + quick actions. Cmd/Ctrl+K. */
export function CommandPalette() {
  const { isOpen, open, close } = useCommandPalette((s) => s);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  // Quick-capture: when the query starts with "!", Enter drops it into the inbox.
  const captureMode = query.startsWith("!");
  const captureText = query.slice(1).trim();
  const doCapture = async () => {
    if (!captureText) return;
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ text: captureText }),
    });
    setQuery("");
    close();
    router.refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [isOpen]);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl">
        <Command
          className="glass overflow-hidden rounded-2xl"
          label="命令面板"
          loop
        >
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (captureMode && e.key === "Enter" && captureText) {
                e.preventDefault();
                void doCapture();
              }
            }}
            placeholder="搜索 / 输入命令，或以 ! 开头快速捕捉一条想法…"
            className="w-full border-b border-[rgb(var(--border)/0.1)] bg-transparent px-4 py-3.5 text-sm text-fg outline-none placeholder:text-muted"
          />
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            {captureMode ? (
              <div className="px-3 py-4 text-sm text-fg">
                {captureText ? (
                  <>
                    按 <kbd className="rounded bg-[rgb(var(--glass-bg)/0.15)] px-1.5">Enter</kbd>{" "}
                    捕捉到收件箱：<span className="text-brand-cyan">{captureText}</span>
                  </>
                ) : (
                  <span className="text-muted">在 ! 后面输入内容，回车存入收件箱。</span>
                )}
              </div>
            ) : (
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                没有匹配结果
              </Command.Empty>
            )}

            {!captureMode && (
              <>
            <Command.Group heading="快捷动作" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
              <PaletteItem icon={Inbox} onSelect={() => go("/inbox")} value="快速捕捉 收件箱 inbox">
                打开收件箱（或输入 ! 直接捕捉）
              </PaletteItem>
              <PaletteItem icon={Plus} onSelect={() => go("/tasks?new=1")}>
                新建任务
              </PaletteItem>
              <PaletteItem icon={FileText} onSelect={() => go("/reports/daily?generate=1")}>
                生成今日日报
              </PaletteItem>
              <PaletteItem icon={CalendarRange} onSelect={() => go("/reports/weekly?current=1")}>
                打开本周周报
              </PaletteItem>
              <PaletteItem icon={RefreshCw} onSelect={() => go("/admin/git")}>
                Git 同步
              </PaletteItem>
              <PaletteItem
                icon={SunMoon}
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  close();
                }}
              >
                切换主题
              </PaletteItem>
            </Command.Group>

            <Command.Group heading="前往" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
              <PaletteItem icon={LayoutDashboard} onSelect={() => go("/")} value="仪表盘 dashboard">仪表盘</PaletteItem>
              <PaletteItem icon={Target} onSelect={() => go("/requirements")} value="需求池 requirements">需求池</PaletteItem>
              <PaletteItem icon={Lightbulb} onSelect={() => go("/ideas")} value="选题库 ideas">选题库</PaletteItem>
              <PaletteItem icon={Rss} onSelect={() => go("/feeds")} value="情报源 feeds">情报源</PaletteItem>
            </Command.Group>

            {items.length > 0 && (
              <Command.Group heading="内容" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
                {items.map((it) => {
                  const Icon = TYPE_ICON[it.type] ?? ListTodo;
                  return (
                    <PaletteItem
                      key={it.id}
                      icon={Icon}
                      onSelect={() => go(it.href)}
                      value={`${it.title} ${it.type}`}
                    >
                      {it.title}
                    </PaletteItem>
                  );
                })}
              </Command.Group>
            )}
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({
  icon: Icon,
  children,
  onSelect,
  value,
}: {
  icon: typeof ListTodo;
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value ?? String(children)}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg data-[selected=true]:bg-[rgb(var(--aurora-cyan)/0.14)]"
    >
      <Icon size={15} className="text-muted" />
      {children}
    </Command.Item>
  );
}
