/**
 * Simple server-response benchmark (S2-4). Hits a set of routes N times against
 * an ALREADY-RUNNING production server and reports P50/P95/P99 latency.
 *
 * Usage:
 *   pnpm build && pnpm start -p 3200 &   # in one shell (with a stress vault)
 *   BENCH_BASE=http://localhost:3200 pnpm bench
 */

const BASE = process.env.BENCH_BASE ?? "http://localhost:3000";
const N = Number(process.env.BENCH_N ?? 60);
const WARMUP = Number(process.env.BENCH_WARMUP ?? 5);

const ROUTES = ["/", "/tasks", "/reports/daily", "/api/tasks", "/api/search?q=压测"];

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function timeOnce(url: string): Promise<number> {
  const t0 = performance.now();
  const res = await fetch(url);
  await res.arrayBuffer(); // drain body
  return performance.now() - t0;
}

async function main() {
  console.log(`bench: ${BASE}  N=${N} (warmup ${WARMUP})\n`);
  const table: Record<string, { p50: number; p95: number; p99: number; max: number }> = {};

  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    // warmup
    for (let i = 0; i < WARMUP; i++) {
      try {
        await timeOnce(url);
      } catch {
        /* ignore warmup errors */
      }
    }
    const samples: number[] = [];
    for (let i = 0; i < N; i++) {
      try {
        samples.push(await timeOnce(url));
      } catch (e) {
        console.error(`  ${route} request failed:`, (e as Error).message);
      }
    }
    samples.sort((a, b) => a - b);
    table[route] = {
      p50: Math.round(pct(samples, 50)),
      p95: Math.round(pct(samples, 95)),
      p99: Math.round(pct(samples, 99)),
      max: Math.round(samples[samples.length - 1] ?? 0),
    };
  }

  console.log("route                         p50    p95    p99    max   (ms)");
  console.log("─".repeat(64));
  for (const [route, r] of Object.entries(table)) {
    console.log(
      `${route.padEnd(28)} ${String(r.p50).padStart(5)} ${String(r.p95).padStart(6)} ${String(r.p99).padStart(6)} ${String(r.max).padStart(6)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
