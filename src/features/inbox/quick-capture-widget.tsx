import { QuickCaptureForm } from "@/features/inbox/quick-capture-form";

/** Dashboard widget: a one-line capture box that drops a note into vault/inbox. */
export function QuickCaptureWidget() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">一句话先记下来，稍后再分诊。</p>
      <QuickCaptureForm compact />
    </div>
  );
}
