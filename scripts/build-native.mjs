/**
 * Build the one native module the app needs at runtime (better-sqlite3), by
 * running its own install script (prebuild-install → prebuilt binary, or
 * node-gyp fallback). Used by CI after `pnpm install --ignore-scripts`, which
 * pnpm 11 otherwise blocks with ERR_PNPM_IGNORED_BUILDS. Portable across OSes.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function build(pkgName) {
  const pkgDir = path.dirname(require.resolve(`${pkgName}/package.json`));
  console.log(`building native module: ${pkgName} @ ${pkgDir}`);
  execSync("npm run install", { cwd: pkgDir, stdio: "inherit" });
}

try {
  build("better-sqlite3");
  // sanity check it loads
  require("better-sqlite3");
  console.log("native module OK");
} catch (e) {
  console.error("native build failed:", e.message);
  process.exit(1);
}
