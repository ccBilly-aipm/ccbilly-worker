"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GlassCard } from "@/components/ui/glass-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ScheduledItem {
  slug: string;
  title: string;
  publishDate: string; // YYYY-MM-DD
  platforms: string[];
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function DayCell({
  date,
  items,
  inMonth,
  isToday,
}: {
  date: string;
  items: ScheduledItem[];
  inMonth: boolean;
  isToday: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[76px] rounded-lg border border-[rgb(var(--border)/0.08)] p-1.5",
        inMonth ? "bg-[rgb(var(--glass-bg)/0.03)]" : "opacity-40",
        isOver && "ring-1 ring-[rgb(var(--aurora-cyan)/0.5)]",
      )}
    >
      <div
        className={cn(
          "mb-1 text-[11px] tabular",
          isToday ? "font-semibold text-brand-cyan" : "text-muted",
        )}
      >
        {Number(date.slice(-2))}
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <DragItem key={it.slug} item={it} />
        ))}
      </div>
    </div>
  );
}

function DragItem({ item }: { item: ScheduledItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.slug,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title={item.title}
      className={cn(
        "cursor-grab truncate rounded bg-[rgb(var(--aurora-indigo)/0.25)] px-1 py-0.5 text-[10px] text-fg",
        isDragging && "opacity-50",
      )}
    >
      {item.platforms[0] ? `[${item.platforms[0]}] ` : ""}
      {item.title}
    </div>
  );
}

/**
 * Publish scheduling calendar (blueprint B4.3): month grid; drag a content card to
 * a day to set its publish_date via the auth-guarded API.
 */
export function PublishCalendar({
  items,
  year,
  month,
  today,
}: {
  items: ScheduledItem[];
  year: number;
  month: number; // 0-based
  today: string;
}) {
  const router = useRouter();
  const [ym, setYm] = useState({ year, month });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const first = new Date(ym.year, ym.month, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(ym.year, ym.month + 1, 0).getDate();

  // build a 6x7 grid of dates
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < startDow; i++) {
    const d = new Date(ym.year, ym.month, -(startDow - 1 - i));
    cells.push({ date: ymd(d.getFullYear(), d.getMonth(), d.getDate()), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: ymd(ym.year, ym.month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const [ly, lm, ld] = last.split("-").map(Number);
    const nd = new Date(ly, lm - 1, ld + 1);
    cells.push({ date: ymd(nd.getFullYear(), nd.getMonth(), nd.getDate()), inMonth: false });
    if (cells.length >= 42) break;
  }

  const onDragEnd = async (e: DragEndEvent) => {
    const slug = String(e.active.id);
    const date = e.over ? String(e.over.id) : null;
    if (!date) return;
    await fetch(`/api/content/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ publish_date: date }),
    });
    router.refresh();
  };

  const monthLabel = `${ym.year} 年 ${ym.month + 1} 月`;

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="上个月"
          onClick={() =>
            setYm((s) =>
              s.month === 0
                ? { year: s.year - 1, month: 11 }
                : { ...s, month: s.month - 1 },
            )
          }
          className="rounded p-1 text-muted hover:text-fg"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-display text-sm font-medium text-fg tabular">
          {monthLabel}
        </span>
        <button
          type="button"
          aria-label="下个月"
          onClick={() =>
            setYm((s) =>
              s.month === 11
                ? { year: s.year + 1, month: 0 }
                : { ...s, month: s.month + 1 },
            )
          }
          className="rounded p-1 text-muted hover:text-fg"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <DayCell
              key={cell.date}
              date={cell.date}
              inMonth={cell.inMonth}
              isToday={cell.date === today}
              items={items.filter((it) => it.publishDate === cell.date)}
            />
          ))}
        </div>
      </DndContext>
    </GlassCard>
  );
}
