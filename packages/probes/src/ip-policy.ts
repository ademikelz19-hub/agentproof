/**
 * IP address policy for the probe transport (SSRF defence, section 18 of
 * the build prompt).
 *
 * Uses `ipaddr.js` for range classification instead of hand-rolled
 * string-prefix comparisons — this is security-critical code and a
 * maintained, widely-used IP-range library is far less likely to contain a
 * subtle CIDR bug than ad-hoc string matching. IPv4-mapped IPv6 addresses
 * (e.g. `::ffff:127.0.0.1`) are unwrapped to their embedded IPv4 address
 * and re-checked, so they can't be used to smuggle a blocked address past
 * an IPv6-only check.
 */

import ipaddr from 'ipaddr.js';

export type IpBlockReason =
  | 'LOOPBACK'
  | 'PRIVATE_RFC1918'
  | 'LINK_LOCAL'
  | 'CARRIER_GRADE_NAT'
  | 'UNIQUE_LOCAL_IPV6'
  | 'MULTICAST'
  | 'RESERVED'
  | 'UNSPECIFIED'
  | 'BROADCAST'
  | 'UNPARSEABLE';

export interface IpCheckResult {
  allowed: boolean;
  reason?: IpBlockReason;
  /** The address actually classified — for IPv4-mapped IPv6 input this is the unwrapped IPv4 address. */
  normalized?: string;
}

/**
 * Ranges from ipaddr.js's `.range()` classification that must always be
 * rejected as probe destinations. Deliberately a blocklist expressed in
 * terms of named ranges (not raw prefixes) so it reads as a policy, not
 * arithmetic.
 */
const BLOCKED_IPV4_RANGES: Record<string, IpBlockReason> = {
  unspecified: 'UNSPECIFIED',
  broadcast: 'BROADCAST',
  multicast: 'MULTICAST',
  linkLocal: 'LINK_LOCAL', // includes 169.254.169.254 cloud metadata
  loopback: 'LOOPBACK',
  carrierGradeNat: 'CARRIER_GRADE_NAT',
  private: 'PRIVATE_RFC1918',
  reserved: 'RESERVED',
};

const BLOCKED_IPV6_RANGES: Record<string, IpBlockReason> = {
  unspecified: 'UNSPECIFIED',
  linkLocal: 'LINK_LOCAL',
  multicast: 'MULTICAST',
  loopback: 'LOOPBACK',
  uniqueLocal: 'UNIQUE_LOCAL_IPV6',
  reserved: 'RESERVED',
};

function checkIpv4(addr: ipaddr.IPv4): IpCheckResult {
  const range = addr.range();
  const blocked = BLOCKED_IPV4_RANGES[range];
  if (blocked) {
    return { allowed: false, reason: blocked, normalized: addr.toString() };
  }
  return { allowed: true, normalized: addr.toString() };
}

/**
 * Classify a single IP address string. Handles IPv4-mapped IPv6
 * (`::ffff:a.b.c.d`) and 6to4/NAT64-style embeddings by unwrapping to the
 * embedded IPv4 address before classifying, so a blocked IPv4 address
 * cannot slip through disguised as IPv6.
 */
export function checkIpPolicy(ip: string): IpCheckResult {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(ip);
  } catch {
    return { allowed: false, reason: 'UNPARSEABLE' };
  }

  if (parsed.kind() === 'ipv4') {
    return checkIpv4(parsed as ipaddr.IPv4);
  }

  const v6 = parsed as ipaddr.IPv6;

  // Unwrap IPv4-mapped (::ffff:a.b.c.d) and IPv4-translated / NAT64-ish
  // embeddings so the embedded IPv4 address gets checked against the IPv4
  // blocklist too, not just whatever the IPv6 range classifier reports.
  if (v6.isIPv4MappedAddress()) {
    return checkIpv4(v6.toIPv4Address());
  }

  const range = v6.range();
  const blocked = BLOCKED_IPV6_RANGES[range];
  if (blocked) {
    return { allowed: false, reason: blocked, normalized: v6.toString() };
  }
  return { allowed: true, normalized: v6.toString() };
}

/** True only if every resolved address for a hostname is allowed. One bad address among many is enough to reject the whole target — we never let the caller pick "the safe one" among mixed results. */
export function checkAllIpPolicies(ips: string[]): IpCheckResult {
  if (ips.length === 0) {
    return { allowed: false, reason: 'UNPARSEABLE' };
  }
  for (const ip of ips) {
    const result = checkIpPolicy(ip);
    if (!result.allowed) {
      return result;
    }
  }
  return { allowed: true };
}
