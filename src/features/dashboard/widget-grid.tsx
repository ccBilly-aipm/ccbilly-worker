"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Lock, Unlock } from "lucide-react";
import { WIDGETS, type WidgetId } from "@/lib/dashboard/widgets";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils/cn";

export interface Placement {
  id: WidgetId;
  w: number;
}

const SPAN: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
};

function SortableWidget({
  placement,
  editing,
  onCycleWidth,
  children,
}: {
  placement: Placement;
  editing: boolean;
  onCycleWidth: (id: WidgetId) => void;
  children: ReactNode;
}) {
  const def = WIDGETS[placement.id];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: placement.id, disabled: !editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "col-span-1",
        SPAN[placement.w] ?? "md:col-span-2",
        isDragging && "opacity-70",
      )}
    >
      <GlassCard className="h-full">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted">{def.title}</h3>
          {editing && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onCycleWidth(placement.id)}
                title="调整宽度"
                aria-label={`调整 ${def.title} 宽度`}
                className="rounded p-1 text-muted hover:text-fg"
              >
                <Maximize2 size={14} />
              </button>
              <button
                type="button"
                title="拖拽排序"
                aria-label={`拖拽 ${def.title}`}
                className="cursor-grab rounded p-1 text-muted hover:text-fg active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <GripVertical size={14} />
              </button>
            </div>
          )}
        </div>
        {children}
      </GlassCard>
    </div>
  );
}

/**
 * Drag-and-drop Bento widget grid (ADR-021). `content` maps each widget id to its
 * server-rendered node. Edit mode enables drag-reorder + width cycling; the
 * resulting layout is saved to the active preset via the auth-guarded API.
 */
export function WidgetGrid({
  initialLayout,
  content,
}: {
  initialLayout: Placement[];
  content: Partial<Record<WidgetId, ReactNode>>;
}) {
  const [layout, setLayout] = useState<Placement[]>(initialLayout);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persist = async (next: Placement[]) => {
    setSaving(true);
    try {
      await fetch("/api/dashboard", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-ccbilly-admin": "1" },
        body: JSON.stringify({ layout: next }),
      });
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = layout.findIndex((p) => p.id === active.id);
    const newIdx = layout.findIndex((p) => p.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(layout, oldIdx, newIdx);
    setLayout(next);
    void persist(next);
  };

  const cycleWidth = (id: WidgetId) => {
    const next = layout.map((p) => {
      if (p.id !== id) return p;
      const widths = WIDGETS[id].widths;
      const i = widths.indexOf(p.w as 1 | 2 | 3 | 4);
      return { ...p, w: widths[(i + 1) % widths.length] };
    });
    setLayout(next);
    void persist(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {editing && saving && <span className="text-xs text-muted">保存中…</span>}
        {editing && !saving && (
          <span className="text-xs text-success">布局已保存</span>
        )}
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="glass glass-hover inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-fg"
        >
          {editing ? <Lock size={13} /> : <Unlock size={13} />}
          {editing ? "完成编辑" : "编辑布局"}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={layout.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {layout.map((p) => (
              <SortableWidget
                key={p.id}
                placement={p}
                editing={editing}
                onCycleWidth={cycleWidth}
              >
                {content[p.id] ?? (
                  <p className="py-6 text-center text-sm text-muted">
                    此 widget 尚无内容
                  </p>
                )}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
