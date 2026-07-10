import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Reads the isolated E2E vault paths written by playwright.config.ts. */
export function e2ePaths(): {
  root: string;
  vault: string;
  cache: string;
  skills: string;
} {
  const p = path.join(os.tmpdir(), "ccbilly-e2e-paths.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
