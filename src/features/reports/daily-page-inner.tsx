"use client";

import { useSearchParams } from "next/navigation";
import { DailyClient } from "@/features/reports/daily-client";

export function DailyPageInner() {
  const params = useSearchParams();
  return <DailyClient generateToday={params.get("generate") === "1"} />;
}
