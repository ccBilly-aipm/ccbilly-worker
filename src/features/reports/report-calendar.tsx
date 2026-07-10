"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { localDateKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

interface CalEntry {
  key: string;
  status: string;
}

/** Month calendar for browsing daily reports (spec §6.3). Days with a report get
 *  a dot (green=final, amber=draft); click to select. */
export function ReportCalendar({
  entries,
  selected,
  onSelect,
}: {
  type: "daily";
  entries: CalEntry[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(selected + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const statusByKey = new Map(entries.map((e) => [e.key, e.status]));
  const first = new Date(cursor.year, cursor.month, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-based
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const today = localDateKey();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(localDateKey(new Date(cursor.year, cursor.month, d)));
  }

  const shift = (delta: number) => {
    const m = cursor.month + delta;
    setCursor({
      year: cursor.year + Math.floor(m / 12),
      month: ((m % 12) + 12) % 12,
    });
  };

  return (
    <GlassCard className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="上个月" className="text-muted hover:text-fg">
          <ChevronLeft size={16} />
        </button>
        <span className="font-display text-sm text-fg tabular">
          {cursor.year} 年 {cursor.month + 1} 月
        </span>
        <button onClick={() => shift(1)} aria-label="下个月" className="text-muted hover:text-fg">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
        {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const day = Number(key.slice(-2));
          const status = statusByKey.get(key);
          const isSelected = key === selected;
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "relative aspect-square rounded-md text-xs tabular transition-colors",
                isSelected
                  ? "bg-[rgb(var(--aurora-cyan)/0.2)] text-fg ring-1 ring-[rgb(var(--aurora-cyan)/0.5)]"
                  : "text-muted hover:bg-[rgb(var(--glass-bg)/0.08)] hover:text-fg",
                isToday && !isSelected && "text-brand-cyan",
              )}
            >
              {day}
              {status && (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    status === "final" ? "bg-success" : "bg-warning",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
