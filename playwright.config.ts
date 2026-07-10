import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * E2E runs against a production build on an isolated port with a throwaway
 * vault + cache + skills dir so tests never touch real user data
 * (HANDBOOK ADR-009: E2E never touches ~/.claude/skills).
 *
 * Paths are computed here (module scope) and passed to BOTH the webServer child
 * process (via env) and the test files (via a JSON side-channel), so the server
 * and the tests agree on which isolated vault to use.
 */
const PORT = 3100;
const E2E_ROOT = path.join(os.tmpdir(), "ccbilly-e2e-fixed");
const VAULT = path.join(E2E_ROOT, "vault");
const CACHE = path.join(E2E_ROOT, "cache");
const SKILLS = path.join(E2E_ROOT, "skills");

// fresh isolated dirs each run
fs.rmSync(E2E_ROOT, { recursive: true, force: true });
for (const d of [VAULT, CACHE, SKILLS]) fs.mkdirSync(d, { recursive: true });
fs.writeFileSync(
  path.join(os.tmpdir(), "ccbilly-e2e-paths.json"),
  JSON.stringify({ root: E2E_ROOT, vault: VAULT, cache: CACHE, skills: SKILLS }),
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      CCBILLY_E2E: "1",
      CCBILLY_VAULT_DIR: VAULT,
      CCBILLY_CACHE_DIR: CACHE,
      CCBILLY_SKILLS_TEST_ROOT: SKILLS,
      ADMIN_PASSCODE: "e2e-pass",
    },
  },
});
