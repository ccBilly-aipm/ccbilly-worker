import { test, expect } from "@playwright/test";

/**
 * S1-4 exposure fail-closed (E2E). The test server runs AUTH_MODE=none with a
 * passcode set. A mutation from localhost is allowed (convenience preserved); the
 * SAME mutation carrying a non-localhost Host header (simulating LAN/public
 * exposure) is failed closed with 403. Read requests are never blocked.
 */

test("localhost mutation is allowed (frictionless), exposed mutation is failed closed", async ({
  request,
}) => {
  // localhost mutation → allowed (creates a task); default Host is localhost:3100
  const ok = await request.post("/api/tasks", {
    data: { title: "auth-exposure-allowed", priority: "P3" },
  });
  expect(ok.status()).toBeLessThan(400);

  // same mutation but pretending to arrive on a public host → 403 fail-closed
  const denied = await request.post("/api/tasks", {
    headers: { host: "attacker.example.com" },
    data: { title: "auth-exposure-denied", priority: "P3" },
  });
  expect(denied.status()).toBe(403);
  const body = await denied.json();
  expect(String(body.detail ?? body.error)).toMatch(/AUTH_MODE|鉴权|拒绝|本机/);
});

test("read requests are never blocked even from a non-localhost host", async ({
  request,
}) => {
  const res = await request.get("/api/tasks", {
    headers: { host: "attacker.example.com" },
  });
  expect(res.status()).toBeLessThan(400);
});
