/**
 * Copy-as-Markdown (spec §6.3/§6.4): produce pure Markdown (no HTML) that pastes
 * cleanly into Feishu (飞书) docs — titles, lists, links intact. The stored body
 * is already clean Markdown; we just prepend a top-level title heading.
 */

export function dailyToMarkdown(date: string, body: string): string {
  return `# ${date} 日报\n\n${body.trim()}\n`;
}

export function weeklyToMarkdown(
  week: string,
  range: string | undefined,
  body: string,
): string {
  const sub = range ? `（${range}）` : "";
  return `# ${week} 周报${sub}\n\n${body.trim()}\n`;
}
