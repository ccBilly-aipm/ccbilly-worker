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
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils/cn";

export interface ContentCard {
  slug: string;
  title: string;
  stage: string;
  platforms: string[];
}

const COLUMNS: { key: string; label: string }[] = [
  { key: "idea", label: "选题" },
  { key: "draft", label: "草稿" },
  { key: "ready", label: "待发" },
  { key: "published", label: "已发" },
  { key: "review", label: "复盘" },
];

function Card({ card }: { card: ContentCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.slug,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg bg-[rgb(var(--glass-bg)/0.08)] p-2.5 text-sm",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          {...attributes}
          {...listeners}
          className="min-w-0 flex-1 cursor-grab truncate text-fg active:cursor-grabbing"
        >
          {card.title}
        </div>
        <Link
          href={`/content/${encodeURIComponent(card.slug)}`}
          aria-label={`打开 ${card.title}`}
          className="shrink-0 text-muted hover:text-brand-cyan"
        >
          <ExternalLink size={13} />
        </Link>
      </div>
      {card.platforms.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {card.platforms.map((p) => (
            <span
              key={p}
              className="rounded bg-[rgb(var(--aurora-cyan)/0.12)] px-1 py-0.5 text-[10px] text-brand-cyan"
            >
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Column({
  col,
  cards,
}: {
  col: { key: string; label: string };
  cards: ContentCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[160px] flex-1 flex-col gap-2 rounded-xl p-2 transition-colors",
        isOver && "bg-[rgb(var(--aurora-cyan)/0.06)]",
      )}
    >
      <h3 className="px-1 text-xs font-medium text-muted">
        {col.label} · {cards.length}
      </h3>
      {cards.map((c) => (
        <Card key={c.slug} card={c} />
      ))}
    </div>
  );
}

/**
 * Content pipeline board (blueprint B4.2): drag a content card across the five
 * stages (选题→草稿→待发→已发→复盘). Persists stage via the auth-guarded API.
 */
export function ContentBoard({ cards: initial }: { cards: ContentCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<ContentCard[]>(initial);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const slug = String(e.active.id);
    const stage = e.over ? String(e.over.id) : null;
    if (!stage || !COLUMNS.some((c) => c.key === stage)) return;
    const card = cards.find((c) => c.slug === slug);
    if (!card || card.stage === stage) return;
    setCards((prev) =>
      prev.map((c) => (c.slug === slug ? { ...c, stage } : c)),
    );
    await fetch(`/api/content/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
      body: JSON.stringify({ stage }),
    });
    router.refresh();
  };

  return (
    <GlassCard>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-2 overflow-x-auto">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              col={col}
              cards={cards.filter((c) => (c.stage || "idea") === col.key)}
            />
          ))}
        </div>
      </DndContext>
    </GlassCard>
  );
}
