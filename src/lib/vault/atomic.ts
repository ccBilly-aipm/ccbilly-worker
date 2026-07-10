import fs from "node:fs";
import path from "node:path";

/**
 * Atomic file writes: write to a temp file in the same directory, fsync, then
 * rename over the target (spec §2, HANDBOOK ADR-004). rename is atomic on the
 * same filesystem, so a crash never leaves a half-written .md file.
 */
export async function atomicWriteFile(
  filePath: string,
  contents: string,
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.tmp-${process.pid}-${counter++}`,
  );
  const fh = await fs.promises.open(tmp, "w");
  try {
    await fh.writeFile(contents, "utf8");
    await fh.sync();
  } finally {
    await fh.close();
  }
  await fs.promises.rename(tmp, filePath);
}

let counter = 0;

export async function readFileUtf8(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, "utf8");
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** List *.md files (non-recursive) in a directory; returns [] if dir missing. */
export async function listMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => path.join(dir, e.name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/** Recursively list *.md files under a directory (for knowledge base). */
export async function listMarkdownFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(d, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith(".")) continue; // skip .obsidian, .trash, etc.
        await walk(full);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}
