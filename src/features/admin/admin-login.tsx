"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/** Passcode login (spec §6.8). Shown when ADMIN_PASSCODE is set but not authed. */
export function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("口令错误");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20">
      <GlassCard className="w-full space-y-4 text-center">
        <Lock size={28} className="mx-auto text-brand-cyan" />
        <h1 className="font-display text-xl font-semibold text-fg">后台管理</h1>
        <p className="text-sm text-muted">请输入管理口令</p>
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="ADMIN_PASSCODE"
          className="input text-center"
        />
        {err && <p className="text-sm text-danger">{err}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="btn-brand w-full rounded-lg py-2 text-sm disabled:opacity-60"
        >
          {busy ? "验证中…" : "进入"}
        </button>
        <p className="flex items-start gap-1.5 text-left text-xs text-muted">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-warning" />
          此鉴权仅防本机误触。若公网部署，必须另加真正的认证层。
        </p>
      </GlassCard>
    </div>
  );
}
