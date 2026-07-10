import { isAdminAuthed, isPasscodeConfigured } from "@/lib/admin/auth";
import { AdminLogin } from "@/features/admin/admin-login";
import { AdminNav } from "@/features/admin/admin-nav";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthed();
  if (!authed) return <AdminLogin />;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-fg">后台管理</h1>
        {!isPasscodeConfigured() && (
          <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
            <ShieldAlert size={12} /> 未设置 ADMIN_PASSCODE
          </span>
        )}
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
