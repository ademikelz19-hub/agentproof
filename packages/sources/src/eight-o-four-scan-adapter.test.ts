import { describe, expect, it } from 'vitest';
import { EightOFourScanAdapter } from './eight-o-four-scan-adapter';

describe('EightOFourScanAdapter — honesty about network access', () => {
  const adapter = new EightOFourScanAdapter();

  it('listAgents reports BLOCKED_LIVE_NETWORK rather than returning fabricated agents', async () => {
    const result = await adapter.listAgents();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('BLOCKED_LIVE_NETWORK');
      expect(result.detail).toMatch(/unreachable/);
    }
  });

  it('getAgentMetadata reports BLOCKED_LIVE_NETWORK rather than returning fabricated metadata', async () => {
    const result = await adapter.getAgentMetadata('bsc:1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('BLOCKED_LIVE_NETWORK');
  });

  it('getAgentServices reports BLOCKED_LIVE_NETWORK rather than returning fabricated services', async () => {
    const result = await adapter.getAgentServices('bsc:1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('BLOCKED_LIVE_NETWORK');
  });

  it('declares the correct chain and source label', () => {
    expect(adapter.chain).toBe('bsc');
    expect(adapter.sourceLabel).toBe('8004scan');
  });
});
