import dns from "node:dns/promises";
import net from "node:net";

/**
 * SSRF defense (S1-3 / ADR-015). Classifies an IP literal as blocked (loopback,
 * private, link-local, cloud metadata, etc.) and resolves a hostname to all its
 * IPs to check every one. Default-deny for internal targets; the cloud metadata
 * address (169.254.169.254) is ALWAYS blocked, even when internal targets are
 * explicitly allowed. See docs/SECURITY_AUDIT.md §S1-3.
 */

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/** The cloud metadata address is never proxyable, regardless of settings. */
const METADATA_IPS = new Set(["169.254.169.254", "fd00:ec2::254"]);

/** Normalize odd IPv4 literal forms (decimal, hex, octal) to dotted-quad. */
function normalizeIpv4Literal(host: string): string | null {
  // already dotted quad
  if (net.isIPv4(host)) return host;
  // pure decimal, e.g. 2130706433 => 127.0.0.1
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }
  // hex, e.g. 0x7f000001
  if (/^0x[0-9a-f]+$/i.test(host)) {
    const n = parseInt(host, 16);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }
  return null;
}

function ipv4Blocked(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local (incl. metadata)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function ipv6Blocked(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) — extract and re-check as IPv4
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Blocked(mapped[1]);
  return false;
}

/**
 * Is this IP literal (any notation) a blocked internal/reserved address?
 * `allowInternal` only relaxes private/loopback ranges — metadata stays blocked.
 */
export function isBlockedAddress(host: string, allowInternal = false): boolean {
  // metadata is absolute — check its every notation by normalizing first
  const v4 = normalizeIpv4Literal(host);
  const canonical = v4 ?? host;
  if (METADATA_IPS.has(canonical.toLowerCase())) return true;

  let blocked: boolean;
  if (net.isIPv6(host)) blocked = ipv6Blocked(host);
  else if (v4) blocked = ipv4Blocked(v4);
  else return false; // not an IP literal → hostname, resolved separately

  if (!blocked) return false;
  // metadata already handled above; other internal ranges relax under allowInternal
  return !allowInternal;
}

/**
 * Assert a URL is safe to proxy to: valid http(s), and EVERY resolved IP passes
 * isBlockedAddress. Throws SsrfError otherwise. Returns the resolved IP list.
 */
export async function assertProxyableUrl(
  rawUrl: string,
  allowInternal = false,
): Promise<{ url: URL; addresses: string[] }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("目标 URL 非法");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("仅允许 http/https 目标");
  }

  const host = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  // If the host is an IP literal, check it directly (no DNS).
  if (net.isIP(host) || normalizeIpv4Literal(host)) {
    if (isBlockedAddress(host, allowInternal)) {
      throw new SsrfError(`拒绝：目标解析到受限地址（${host}）`);
    }
    return { url, addresses: [host] };
  }

  // Hostname → resolve ALL addresses and check each (defeats DNS split answers).
  let resolved: { address: string }[];
  try {
    resolved = await dns.lookup(host, { all: true });
  } catch {
    throw new SsrfError(`拒绝：无法解析目标主机（${host}）`);
  }
  const addresses = resolved.map((r) => r.address);
  for (const addr of addresses) {
    if (isBlockedAddress(addr, allowInternal)) {
      throw new SsrfError(`拒绝：目标解析到受限地址（${addr}）`);
    }
  }
  return { url, addresses };
}
