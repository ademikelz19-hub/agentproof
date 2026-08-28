import { describe, expect, it } from 'vitest';
import { parseExternal, rawAgentMetadataSchema, type Provenance } from '@agentproof/core';
import { normalizeAgentServices } from './normalize';
import {
  SYNTHETIC_8004SCAN_RESPONSE_WITH_BOTH,
  SYNTHETIC_8004SCAN_RESPONSE_WITH_LEGACY_ENDPOINTS,
  SYNTHETIC_8004SCAN_RESPONSE_WITH_SERVICES,
  SYNTHETIC_MALFORMED_RESPONSE,
} from './__fixtures__/synthetic-8004scan-response.fixture';

const provenance: Provenance = {
  source: 'INDEXER',
  origin: 'synthetic-test-fixture',
  observedAt: new Date().toISOString(),
};

describe('normalizeAgentServices — services/endpoints compatibility', () => {
  it('normalizes the current "services" form', () => {
    const parsed = parseExternal(rawAgentMetadataSchema, SYNTHETIC_8004SCAN_RESPONSE_WITH_SERVICES);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const services = normalizeAgentServices('bsc:1', 'bsc', parsed.data, provenance);
    expect(services).toHaveLength(2);
    expect(services[0]?.declarationForm).toBe('SERVICES');
    expect(services[0]?.protocol).toBe('HTTP');
    expect(services[1]?.protocol).toBe('A2A');
  });

  it('normalizes the legacy "endpoints" form', () => {
    const parsed = parseExternal(rawAgentMetadataSchema, SYNTHETIC_8004SCAN_RESPONSE_WITH_LEGACY_ENDPOINTS);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const services = normalizeAgentServices('bsc:2', 'bsc', parsed.data, provenance);
    expect(services).toHaveLength(1);
    expect(services[0]?.declarationForm).toBe('ENDPOINTS');
    expect(services[0]?.url).toBe('https://legacy-agent.test/api');
  });

  it('prefers "services" over "endpoints" when an agent declares both', () => {
    const parsed = parseExternal(rawAgentMetadataSchema, SYNTHETIC_8004SCAN_RESPONSE_WITH_BOTH);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const services = normalizeAgentServices('bsc:3', 'bsc', parsed.data, provenance);
    expect(services).toHaveLength(1);
    expect(services[0]?.url).toBe('https://preferred.test/api');
  });

  it('rejects malformed metadata at the validation boundary before normalization ever runs', () => {
    const parsed = parseExternal(rawAgentMetadataSchema, SYNTHETIC_MALFORMED_RESPONSE);
    expect(parsed.ok).toBe(false);
  });

  it('never invents a URL for an endpoint entry missing both url and endpoint fields', () => {
    const parsed = parseExternal(rawAgentMetadataSchema, {
      endpoints: [{ id: 'no-url-here', type: 'HTTP' }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const services = normalizeAgentServices('bsc:4', 'bsc', parsed.data, provenance);
    expect(services).toHaveLength(0);
  });
});
