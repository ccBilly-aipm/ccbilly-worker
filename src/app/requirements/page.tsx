import { ensureIndexReady } from "@/lib/index/bootstrap";
import { listRequirements } from "@/lib/index/queries";
import { RequirementsClient, type ReqView } from "@/features/pm/requirements-client";
import type { Rice } from "@/lib/schema";

export const dynamic = "force-dynamic";

const DEFAULT_RICE: Rice = { reach: 0, impact: 0, confidence: 1, effort: 1 };

/** Requirement pool + triage (blueprint B3.1). */
export default async function RequirementsPage() {
  await ensureIndexReady();
  const requirements: ReqView[] = listRequirements().map((r) => ({
    slug: r.slug,
    title: String(r.data.title),
    stage: String(r.data.stage ?? "inbox"),
    rice: (r.data.rice as Rice) ?? DEFAULT_RICE,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <RequirementsClient requirements={requirements} />
    </div>
  );
}
