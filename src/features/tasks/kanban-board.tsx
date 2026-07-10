"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { TaskView } from "@/features/tasks/use-tasks";
import { TaskCard } from "@/features/tasks/task-card";
import { STATUS_META, STATUS_ORDER } from "@/features/tasks/task-badges";

/**
 * Kanban board (spec §6.2): columns by status, drag to change status. Dropping a
 * card in a new column PATCHes status, which appends a 动态 log entry server-side.
 */
export function KanbanBoard({
  tasks,
  onPatch,
  onOpen,
}: {
  tasks: TaskView[];
  onPatch: (slug: string, body: Record<string, unknown>) => Promise<unknown>;
  onOpen: (task: TaskView) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // archived tasks are hidden from the board
  const visible = tasks.filter((t) => t.data.status !== "archived");
  const byStatus = (s: string) => visible.filter((t) => t.data.status === s);
  const activeTask = tasks.find((t) => t.slug === activeId) ?? null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const overCol = e.over?.id ? String(e.over.id) : null;
    const slug = String(e.active.id);
    const task = tasks.find((t) => t.slug === slug);
    if (!overCol || !task || task.data.status === overCol) return;
    await onPatch(slug, { action: "status", status: overCol });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={byStatus(status)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  onOpen,
}: {
  status: string;
  tasks: TaskView[];
  onOpen: (t: TaskView) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <div
      ref={setNodeRef}
      className={`glass flex min-h-[240px] flex-col gap-2 p-3 transition-colors ${
        isOver ? "ring-1 ring-[rgb(var(--aurora-cyan)/0.5)]" : ""
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <span className="text-xs text-muted tabular">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-muted">
          拖拽到此
        </div>
      ) : (
        tasks.map((t) => (
          <DraggableCard key={t.slug} task={t} onOpen={() => onOpen(t)} />
        ))
      )}
    </div>
  );
}

function DraggableCard({
  task,
  onOpen,
}: {
  task: TaskView;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.slug,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40" : ""}
    >
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}
