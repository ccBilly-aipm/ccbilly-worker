import { listDecisions } from "@/lib/pm/decision-service";
import { DecisionsClient } from "@/features/pm/decisions-client";
import { NotesToTasks } from "@/features/pm/notes-to-tasks";
import { TemplatesPanel } from "@/features/pm/templates-panel";
import { localDateKey } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/** Decision log + PM utilities: notes→tasks and template pack (blueprint B3.4/5/6). */
export default function DecisionsPage() {
  const decisions = listDecisions();
  const today = localDateKey(new Date());
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <DecisionsClient decisions={decisions} today={today} />
      <div className="grid gap-4 md:grid-cols-2">
        <NotesToTasks />
        <TemplatesPanel />
      </div>
    </div>
  );
}
