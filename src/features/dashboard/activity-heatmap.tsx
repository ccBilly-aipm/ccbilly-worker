"use client";

/**
 * GitHub-style annual activity heatmap (spec §6.1). Data = task 动态 counts per
 * day. 53 week columns × 7 day rows, colored by intensity. Pure SVG, no deps.
 */
export function ActivityHeatmap({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const cell = 11;
  const gap = 3;
  const max = Math.max(1, ...data.map((d) => d.count));

  // group into weeks (columns). data is oldest→newest; align first column to
  // start on the correct weekday.
  const first = data[0] ? new Date(data[0].date + "T00:00:00") : new Date();
  const startPad = (first.getDay() + 6) % 7; // Monday-based

  const cells = [
    ...Array.from({ length: startPad }, () => null),
    ...data,
  ];
  const weeks: (typeof data[number] | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const intensity = (count: number) => {
    if (count === 0) return "rgb(var(--fg) / 0.05)";
    const t = count / max;
    if (t < 0.25) return "rgba(34,211,238,0.25)";
    if (t < 0.5) return "rgba(34,211,238,0.45)";
    if (t < 0.75) return "rgba(129,140,248,0.65)";
    return "rgba(192,132,252,0.9)";
  };

  const width = weeks.length * (cell + gap);
  const height = 7 * (cell + gap);

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="年度活动热力图"
        className="min-w-full"
      >
        {weeks.map((week, wi) =>
          week.map((d, di) => {
            if (!d) return null;
            return (
              <rect
                key={`${wi}-${di}`}
                x={wi * (cell + gap)}
                y={di * (cell + gap)}
                width={cell}
                height={cell}
                rx={2.5}
                fill={intensity(d.count)}
              >
                <title>{`${d.date}: ${d.count} 次活动`}</title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}
