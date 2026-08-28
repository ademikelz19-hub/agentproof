import { describe, expect, it } from 'vitest';
import { checkAllIpPolicies, checkIpPolicy } from './ip-policy';

describe('checkIpPolicy — blocked ranges', () => {
  const blocked: Array<[string, string]> = [
    ['127.0.0.1', 'loopback'],
    ['127.1', 'loopback shorthand'],
    ['127.255.255.254', 'loopback range edge'],
    ['0.0.0.0', 'unspecified'],
    ['10.0.0.1', 'RFC1918 10/8'],
    ['10.255.255.255', 'RFC1918 10/8 edge'],
    ['172.16.0.1', 'RFC1918 172.16/12 start'],
    ['172.31.255.255', 'RFC1918 172.16/12 end'],
    ['192.168.0.1', 'RFC1918 192.168/16'],
    ['192.168.255.255', 'RFC1918 192.168/16 edge'],
    ['169.254.169.254', 'link-local / cloud metadata'],
    ['169.254.0.1', 'link-local'],
    ['100.64.0.1', 'carrier-grade NAT'],
    ['100.127.255.255', 'carrier-grade NAT edge'],
    ['255.255.255.255', 'broadcast'],
    ['224.0.0.1', 'multicast'],
    ['240.0.0.1', 'reserved (class E)'],
    ['::1', 'IPv6 loopback'],
    ['fe80::1', 'IPv6 link-local'],
    ['fc00::1', 'IPv6 unique-local (fc00::/7)'],
    ['fd12:3456:789a::1', 'IPv6 unique-local (fd00::/8)'],
    ['ff02::1', 'IPv6 multicast'],
    ['::', 'IPv6 unspecified'],
    ['::ffff:127.0.0.1', 'IPv4-mapped IPv6 loopback'],
    ['::ffff:169.254.169.254', 'IPv4-mapped IPv6 cloud metadata'],
    ['::ffff:10.0.0.5', 'IPv4-mapped IPv6 RFC1918'],
    ['::ffff:192.168.1.1', 'IPv4-mapped IPv6 RFC1918'],
  ];

  it.each(blocked)('blocks %s (%s)', (ip) => {
    const result = checkIpPolicy(ip);
    expect(result.allowed).toBe(false);
  });

  it('rejects unparseable input', () => {
    const result = checkIpPolicy('not-an-ip');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('UNPARSEABLE');
  });

  it('rejects malformed URLs disguised as addresses', () => {
    expect(checkIpPolicy('127.0.0.1:8080').allowed).toBe(false);
    expect(checkIpPolicy('').allowed).toBe(false);
  });
});

describe('checkIpPolicy — allowed public addresses', () => {
  const allowed = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111'];

  it.each(allowed)('allows %s', (ip) => {
    const result = checkIpPolicy(ip);
    expect(result.allowed).toBe(true);
  });
});

describe('checkAllIpPolicies', () => {
  it('rejects if any resolved address is blocked, even if others are public', () => {
    const result = checkAllIpPolicies(['8.8.8.8', '127.0.0.1']);
    expect(result.allowed).toBe(false);
  });

  it('allows only when every resolved address is public', () => {
    const result = checkAllIpPolicies(['8.8.8.8', '1.1.1.1']);
    expect(result.allowed).toBe(true);
  });

  it('rejects an empty address list', () => {
    expect(checkAllIpPolicies([]).allowed).toBe(false);
  });
});
