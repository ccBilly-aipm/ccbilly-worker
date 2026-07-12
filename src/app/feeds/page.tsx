import { listFeedSources } from "@/lib/creator/feed-service";
import { FeedsClient } from "@/features/creator/feeds-client";

export const dynamic = "force-dynamic";

/** Intelligence feeds (blueprint B4.6). Fetching is SSRF-guarded (red line). */
export default function FeedsPage() {
  const sources = listFeedSources();
  return (
    <div className="mx-auto max-w-3xl">
      <FeedsClient sources={sources} />
    </div>
  );
}
