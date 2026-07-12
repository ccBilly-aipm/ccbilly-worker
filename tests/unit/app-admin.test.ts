import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** App registry service + settings + admin token, over a throwaway vault. */
let tmp: string;
let cacheTmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-app-"));
  cacheTmp = fs.mkdtempSync(path.join(os.tmpdir(), "ccbilly-appcache-"));
  process.env.CCBILLY_VAULT_DIR = tmp;
  process.env.CCBILLY_CACHE_DIR = cacheTmp;
});

afterEach(async () => {
  const { closeDb } = await import("../../src/lib/index/db");
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(cacheTmp, { recursive: true, force: true });
  delete process.env.CCBILLY_VAULT_DIR;
  delete process.env.CCBILLY_CACHE_DIR;
  delete process.env.ADMIN_PASSCODE;
});

describe("app registry service", () => {
  it("creates, lists, updates, and finds by id", async () => {
    const { createApp, listApps, updateApp, getAppById } = await import(
      "../../src/lib/vault/app-service"
    );
    const created = await createApp({
      name: "Excalidraw",
      mode: "iframe",
      url: "https://excalidraw.com",
      icon: "✏️",
      category: "白板",
    });
    expect(created.data.mode).toBe("iframe");
    expect(listApps()).toHaveLength(1);

    const updated = await updateApp(created.slug, { status: "disabled" });
    expect(updated.data.status).toBe("disabled");

    const byId = getAppById(String(created.data.id));
    expect(byId?.data.name).toBe("Excalidraw");
  });

  it("stores proxyBaseUrl for proxy-mode apps", async () => {
    const { createApp } = await import("../../src/lib/vault/app-service");
    const app = await createApp({
      name: "API",
      mode: "proxy",
      url: "/api/proxy/x",
      proxyBaseUrl: "https://example.com",
    });
    expect(app.data.proxyBaseUrl).toBe("https://example.com");
  });
});

describe("settings service", () => {
  it("returns defaults then persists overrides", async () => {
    const { readSettings, writeSettings } = await import(
      "../../src/lib/admin/settings"
    );
    // default is a neutral value (S3 de-personalization); B哥 sets his own name.
    expect(readSettings().displayName).toBe("朋友");
    expect(readSettings().allowInternalProxyTargets).toBe(false); // SSRF fail-closed
    const next = await writeSettings({ displayName: "老板", weekStartsMonday: true });
    expect(next.displayName).toBe("老板");
    expect(readSettings().displayName).toBe("老板");
  });
});

describe("admin passcode auth", () => {
  it("verifies correct passcode and rejects wrong", async () => {
    process.env.ADMIN_PASSCODE = "secret123";
    const { verifyPasscode, isPasscodeConfigured } = await import(
      "../../src/lib/admin/auth"
    );
    expect(isPasscodeConfigured()).toBe(true);
    expect(verifyPasscode("secret123")).toBe(true);
    expect(verifyPasscode("wrong")).toBe(false);
  });

  it("treats no passcode as unconfigured", async () => {
    const { isPasscodeConfigured, verifyPasscode } = await import(
      "../../src/lib/admin/auth"
    );
    expect(isPasscodeConfigured()).toBe(false);
    expect(verifyPasscode("")).toBe(false);
  });
});
