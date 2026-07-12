import { simpleGit, type SimpleGit } from "simple-git";
import { projectRoot } from "@/lib/config";
import { localTimestamp } from "@/lib/utils/date";

/**
 * Git integration (spec §2/§6.8) via simple-git. Every operation degrades
 * gracefully when there is no repo / no remote. RED LINE: never force push,
 * never rewrite history.
 */

function git(): SimpleGit {
  return simpleGit({ baseDir: projectRoot() });
}

/**
 * Sanitize a user-supplied commit message (S1-5). simple-git passes the message
 * as an argument (after `-m`) rather than through a shell, so this is NOT about
 * shell injection — it's defense-in-depth + robustness: strip control chars,
 * collapse a leading dash (so it can never be read as a flag), and cap length.
 */
export function sanitizeCommitMessage(input: string): string {
  // eslint-disable-next-line no-control-regex
  let msg = input
    .replace(/[\x00-\x1f\x7f]/g, " ") // control chars → space
    .replace(/\s+/g, " ") // collapse whitespace runs
    .trim();
  if (msg.startsWith("-")) msg = msg.replace(/^-+/, "").trim();
  if (msg.length > 500) msg = msg.slice(0, 500);
  return msg;
}

export interface GitStatusResult {
  available: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  changed?: number;
  files?: { path: string; status: string }[];
  hasRemote?: boolean;
  conflicted?: string[];
}

export async function getStatus(): Promise<GitStatusResult> {
  const g = git();
  try {
    const isRepo = await g.checkIsRepo();
    if (!isRepo) return { available: false };
    const status = await g.status();
    const remotes = await g.getRemotes(true);
    return {
      available: true,
      branch: status.current ?? undefined,
      ahead: status.ahead,
      behind: status.behind,
      changed: status.files.length,
      files: status.files.map((f) => ({
        path: f.path,
        status: `${f.index}${f.working_dir}`.trim() || "?",
      })),
      hasRemote: remotes.length > 0,
      conflicted: status.conflicted,
    };
  } catch {
    return { available: false };
  }
}

/** Stage everything and commit with an auto-generated (or provided) message. */
export async function quickCommit(message?: string): Promise<{
  ok: boolean;
  message: string;
  detail?: string;
}> {
  const g = git();
  try {
    if (!(await g.checkIsRepo())) {
      return { ok: false, message: "当前目录不是 Git 仓库" };
    }
    const status = await g.status();
    if (status.files.length === 0) {
      return { ok: false, message: "没有需要提交的变更" };
    }
    const provided = message ? sanitizeCommitMessage(message) : "";
    const msg = provided || `chore(vault): sync ${localTimestamp()}`;
    await g.add("-A");
    await g.commit(msg);
    return { ok: true, message: `已提交：${msg}` };
  } catch (e) {
    return { ok: false, message: "提交失败", detail: (e as Error).message };
  }
}

/**
 * Sync = pull --rebase, then push. Reports conflicts instead of forcing.
 * RED LINE: never uses --force.
 */
export async function sync(): Promise<{
  ok: boolean;
  message: string;
  conflicts?: string[];
  detail?: string;
}> {
  const g = git();
  try {
    if (!(await g.checkIsRepo())) {
      return { ok: false, message: "当前目录不是 Git 仓库" };
    }
    const remotes = await g.getRemotes(true);
    if (remotes.length === 0) {
      return {
        ok: false,
        message: "未配置远端。请先 `git remote add origin <url>` 并 push 一次。",
      };
    }
    try {
      await g.pull(["--rebase"]);
    } catch (e) {
      const status = await g.status();
      if (status.conflicted.length > 0) {
        return {
          ok: false,
          message: "检测到冲突，请用外部工具（Obsidian/编辑器）手动解决后再同步。",
          conflicts: status.conflicted,
        };
      }
      return { ok: false, message: "拉取失败", detail: (e as Error).message };
    }
    await g.push();
    return { ok: true, message: "已同步（pull --rebase 后 push 成功）" };
  } catch (e) {
    return { ok: false, message: "同步失败", detail: (e as Error).message };
  }
}
