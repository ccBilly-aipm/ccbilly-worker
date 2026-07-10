import { cn } from "@/lib/utils/cn";

/**
 * Pure-SVG glassmorphism placeholder illustrations (HANDBOOK ADR-007).
 * These stand in for the GPT Image 2 assets B哥 will drop into public/assets/
 * later. Swapping is a one-line change per empty state.
 */

type ArtKind = "tasks" | "reports" | "skills" | "apps" | "knowledge" | "error";

export function PlaceholderArt({
  kind,
  className,
}: {
  kind: ArtKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={cn("h-32 w-40", className)}
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient id={`pa-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#818CF8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.9" />
        </linearGradient>
        <filter id={`glow-${kind}`}>
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* faint stars */}
      {[
        [30, 24],
        [168, 32],
        [150, 120],
        [40, 130],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.2" fill="currentColor" opacity="0.4" />
      ))}

      <g
        stroke={`url(#pa-${kind})`}
        strokeWidth="2"
        fill="rgba(255,255,255,0.06)"
        filter={`url(#glow-${kind})`}
      >
        {kind === "tasks" && (
          <>
            <rect x="62" y="46" width="76" height="68" rx="10" />
            {[62, 78, 94].map((y) => (
              <g key={y}>
                <circle cx="80" cy={y + 6} r="5" fill="none" />
                <line x1="94" y1={y + 6} x2="122" y2={y + 6} strokeWidth="3" />
              </g>
            ))}
          </>
        )}
        {kind === "reports" && (
          <>
            <path d="M60 50 h60 a8 8 0 0 1 8 8 v54 h-76 v-54 a8 8 0 0 1 8 -8Z" />
            <line x1="76" y1="72" x2="120" y2="72" />
            <line x1="76" y1="88" x2="112" y2="88" />
            <circle cx="128" cy="46" r="4" fill={`url(#pa-${kind})`} />
          </>
        )}
        {kind === "skills" && (
          <>
            <path d="M100 118 v-30" />
            <path d="M100 96 l-20 -18 M100 96 l20 -18 M100 108 l-14 -12 M100 108 l14 -12" />
            <polygon points="86,54 114,54 122,72 100,86 78,72" />
            {[80, 120, 86, 114].map((cx, i) => (
              <circle key={i} cx={cx} cy={i < 2 ? 78 : 96} r="3" fill={`url(#pa-${kind})`} />
            ))}
          </>
        )}
        {(kind === "apps" || kind === "knowledge") && (
          <>
            <rect x="52" y="70" width="30" height="30" rx="6" />
            <rect x="86" y="70" width="30" height="30" rx="6" />
            <rect
              x="120"
              y="70"
              width="30"
              height="30"
              rx="6"
              strokeDasharray="4 4"
            />
          </>
        )}
        {kind === "error" && (
          <>
            <ellipse cx="100" cy="82" rx="42" ry="16" fill="none" />
            <circle cx="132" cy="60" r="8" />
            <path
              d="M96 96 q4 8 8 0 M100 104 v2"
              strokeWidth="3"
              fill="none"
            />
          </>
        )}
      </g>
    </svg>
  );
}
