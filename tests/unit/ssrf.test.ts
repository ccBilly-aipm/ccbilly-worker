import { describe, it, expect } from "vitest";
import {
  isBlockedAddress,
  assertProxyableUrl,
  SsrfError,
} from "../../src/lib/net/ssrf";

/**
 * S1-3 adversarial SSRF suite. Proves the IP classifier blocks internal/reserved
 * targets across notations, that the cloud metadata address is never allowed even
 * with allowInternal, and that public targets pass. See SECURITY_AUDIT §S1-3.
 */

describe("isBlockedAddress — internal ranges blocked by default", () => {
  const blocked = [
    "127.0.0.1", // loopback
    "0.0.0.0", // this-host
    "10.0.0.5", // private
    "172.16.0.1", // private
    "172.31.255.255", // private (upper bound)
    "192.168.1.1", // private
    "169.254.0.1", // link-local
    "169.254.169.254", // cloud metadata
    "100.64.0.1", // CGNAT
    "224.0.0.1", // multicast
    "::1", // IPv6 loopback
    "fe80::1", // IPv6 link-local
    "fc00::1", // IPv6 unique-local
    "fd00::1", // IPv6 unique-local
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "2130706433", // decimal 127.0.0.1
    "0x7f000001", // hex 127.0.0.1
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => {
      expect(isBlockedAddress(ip)).toBe(true);
    });
  }
});

describe("isBlockedAddress — public addresses allowed", () => {
  for (const ip of ["1.1.1.1", "8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"]) {
    it(`allows ${ip}`, () => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  }
});

describe("isBlockedAddress — allowInternal relaxes private but NOT metadata", () => {
  it("relaxes private ranges when allowInternal=true", () => {
    expect(isBlockedAddress("192.168.1.1", true)).toBe(false);
    expect(isBlockedAddress("127.0.0.1", true)).toBe(false);
    expect(isBlockedAddress("10.0.0.1", true)).toBe(false);
  });

  it("STILL blocks cloud metadata even with allowInternal=true", () => {
    expect(isBlockedAddress("169.254.169.254", true)).toBe(true);
    expect(isBlockedAddress("2130706433", true)).toBe(false); // 127.0.0.1 relaxed
    // metadata via decimal notation must also stay blocked
    // 169.254.169.254 -> 2852039166
    expect(isBlockedAddress("2852039166", true)).toBe(true);
  });
});

describe("assertProxyableUrl — end to end", () => {
  it("rejects non-http protocols", async () => {
    await expect(assertProxyableUrl("file:///etc/passwd")).rejects.toThrow(
      SsrfError,
    );
    await expect(assertProxyableUrl("ftp://x/y")).rejects.toThrow(SsrfError);
  });

  it("rejects a literal loopback target", async () => {
    await expect(assertProxyableUrl("http://127.0.0.1:8003")).rejects.toThrow(
      SsrfError,
    );
    await expect(assertProxyableUrl("http://[::1]:1234")).rejects.toThrow(
      SsrfError,
    );
  });

  it("rejects decimal-encoded loopback", async () => {
    await expect(
      assertProxyableUrl("http://2130706433/latest/meta-data"),
    ).rejects.toThrow(SsrfError);
  });

  it("rejects the cloud metadata endpoint", async () => {
    await expect(
      assertProxyableUrl("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toThrow(SsrfError);
  });

  it("allows a public IP literal", async () => {
    const { addresses } = await assertProxyableUrl("https://1.1.1.1/");
    expect(addresses).toContain("1.1.1.1");
  });

  it("allows loopback ONLY when allowInternal=true, but never metadata", async () => {
    await expect(
      assertProxyableUrl("http://127.0.0.1:8003", true),
    ).resolves.toBeTruthy();
    await expect(
      assertProxyableUrl("http://169.254.169.254/", true),
    ).rejects.toThrow(SsrfError);
  });
});
