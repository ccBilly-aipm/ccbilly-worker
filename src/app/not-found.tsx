import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg items-center justify-center py-20">
      <EmptyState
        kind="error"
        title="页面走丢了"
        description="这颗小卫星飘出了轨道。回到仪表盘继续吧。"
        action={
          <Link href="/" className="btn-brand rounded-full px-4 py-2 text-sm">
            返回仪表盘
          </Link>
        }
      />
    </div>
  );
}
