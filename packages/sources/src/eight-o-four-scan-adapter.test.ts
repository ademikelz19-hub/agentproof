import { describe, expect, it, vi, afterEach } from 'vitest';
import { EightOFourScanAdapter } from './eight-o-four-scan-adapter';
import { REAL_SHAPE_SANITIZED_8004SCAN_AGENT } from './__fixtures__/real-shape-sanitized-8004scan-agent.fixture';

describe('EightOFourScanAdapter — unit tests with mocked fetch', () => {
  const adapter = new EightOFourScanAdapter();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('declares the correct chain and source label', () => {
    expect(adapter.chain).toBe('bsc');
    expect(adapter.sourceLabel).toBe('8004scan');
  });

  it('listAgents parses and maps raw response correctly', async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          token_id: '315182',
          chain_id: 56,
          contract_address: '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
          name: 'Zkgev3te3',
          description: 'Sports agent',
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await adapter.listAgents();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('bsc:315182');
      expect(result.data[0]?.onchainId).toBe('315182');
      expect(result.data[0]?.registryAddress).toBe('0x8004a169fb4a3325136eb29fa0ceb6d2e539a432');
    }
  });

  it('getAgentMetadata parses offchain metadata correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => REAL_SHAPE_SANITIZED_8004SCAN_AGENT,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await adapter.getAgentMetadata('bsc:315182');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Zkgev3te3');
      expect(result.data.metadataUri).toBe('https://metadata.evoevo.ai/agents/4704017');
      expect(result.data.metadataResolved).toBe(true);
    }
  });

  it('getAgentServices parses and normalizes services correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => REAL_SHAPE_SANITIZED_8004SCAN_AGENT,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await adapter.getAgentServices('bsc:315182');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.url).toBe('https://evoevo.ai/agent/detail?id=4704017');
      expect(result.data[0]?.protocol).toBe('HTTP');
    }
  });
});
