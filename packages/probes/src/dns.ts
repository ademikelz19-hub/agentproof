/**
 * Thin wrapper around Node's DNS resolution, isolated into its own module
 * so tests can substitute `dns.resolveAll` to simulate rebinding /
 * malicious-DNS scenarios without needing real network access or a real
 * attacker-controlled nameserver.
 */

import { lookup } from 'node:dns/promises';

export interface DnsResolver {
  resolveAll(hostname: string): Promise<string[]>;
}

export const dns: DnsResolver = {
  async resolveAll(hostname: string): Promise<string[]> {
    // If the hostname is already a literal IP address, dns.lookup returns
    // it as-is — no network round trip needed, and this still runs it
    // through the same policy check downstream.
    const results = await lookup(hostname, { all: true, verbatim: true });
    return results.map((r) => r.address);
  },
};
