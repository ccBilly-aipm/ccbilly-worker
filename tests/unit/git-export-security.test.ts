import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sanitizeCommitMessage } from "../../src/lib/git/git";

/**
 * S1-5: commit-message sanitization + structural invariants that guarantee
 * "never force push / no raw shell / fixed export root". See SECURITY_AUDIT §S1-5.
 */

describe("sanitizeCommitMessage", () => {
  it("keeps a normal message intact", () => {
    expect(sanitizeCommitMessage("feat: add thing")).toBe("feat: add thing");
  });
  it("strips control characters", () => {
    expect(sanitizeCommitMessage("hello\x00\x07\x1bworld")).toBe("hello world");
  });
  it("removes a leading dash so it can't be read as a git flag", () => {
    expect(sanitizeCommitMessage("--upload-pack=evil")).not.toMatch(/^-/);
    expect(sanitizeCommitMessage("-m malicious")).not.toMatch(/^-/);
  });
  it("caps length at 500", () => {
    expect(sanitizeCommitMessage("x".repeat(1000)).length).toBe(500);
  });
});

describe("structural security invariants (regression guards)", () => {
  const gitSrc = fs.readFileSync(
    path.join(__dirname, "../../src/lib/git/git.ts"),
    "utf8",
  );

  it("git.ts never uses --force / force push", () => {
    // allow the words only inside comments documenting the red line; assert no
    // actual --force token is passed to a git call.
    expect(gitSrc).not.toMatch(/push\([^)]*force/i);
    expect(gitSrc).not.toMatch(/["'`]--force/);
  });

  it("git.ts uses no raw shell / child_process / .raw()", () => {
    expect(gitSrc).not.toMatch(/\.raw\(/);
    expect(gitSrc).not.toMatch(/child_process|execSync|\bspawn\(/);
  });

  it("export route fixes the archiver root to vaultDir() with no external path param", () => {
    const exportSrc = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/admin/export/route.ts"),
      "utf8",
    );
    expect(exportSrc).toMatch(/archive\.directory\(\s*vaultDir\(\)/);
    // the export handler takes no request/params argument (fixed root)
    expect(exportSrc).toMatch(/export async function GET\(\)/);
  });
});
