import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listCaptures } from "@/lib/inbox/inbox-service";
import { GlassCard } from "@/components/ui/glass-card";
import { QuickCaptureForm } from "@/features/inbox/quick-capture-form";
import { TriageList } from "@/features/inbox/triage-list";

export const dynamic = "force-dynamic";

/** Quick-capture inbox + triage (blueprint B5.1). */
export default async function InboxPage() {
  await ensureIndexReady();
  const items = listCaptures();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-fg">收件箱</h1>
        <p className="text-sm text-muted">
          先把想法一句话记下来，稍后分诊为任务 / 需求 / 选题 / 笔记。
        </p>
      </header>

      <GlassCard>
        <QuickCaptureForm />
      </GlassCard>

      <GlassCard>
        <h2 className="mb-3 font-display text-lg font-medium text-fg">
          待分诊 · {items.length}
        </h2>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            收件箱是空的。用上面的输入框记点什么。
          </p>
        ) : (
          <TriageList items={items} />
        )}
      </GlassCard>
    </div>
  );
}
