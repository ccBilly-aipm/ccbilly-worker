import { cn } from "@/lib/utils/cn";

/** Brand-gradient progress ring (spec §7: 进度环 uses the brand gradient). */
export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  label,
  className,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const gid = `ring-${size}-${stroke}`;

  return (
    <div className={cn("relative inline-grid place-items-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--fg) / 0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-space"
        />
      </svg>
      <span className="absolute font-display text-xs font-semibold text-fg tabular">
        {label ?? `${clamped}%`}
      </span>
    </div>
  );
}
