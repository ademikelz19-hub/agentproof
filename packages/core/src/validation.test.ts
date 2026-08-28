import { describe, expect, it } from 'vitest';
import { parseExternal, parseExternalJsonText, rawAgentMetadataSchema } from './validation';

describe('parseExternal', () => {
  it('accepts a well-formed metadata document with services', () => {
    const result = parseExternal(rawAgentMetadataSchema, {
      name: 'Test Agent',
      services: [{ id: 's1', type: 'HTTP', url: 'https://example.test/api' }],
    });
    expect(result.ok).toBe(true);
  });

  it('accepts a well-formed metadata document with legacy endpoints', () => {
    const result = parseExternal(rawAgentMetadataSchema, {
      endpoints: [{ id: 'e1', endpoint: 'https://example.test/api' }],
    });
    expect(result.ok).toBe(true);
  });

  it('fails safely (no throw) on wrong field types', () => {
    expect(() =>
      parseExternal(rawAgentMetadataSchema, { name: 42, services: 'not-an-array' }),
    ).not.toThrow();
    const result = parseExternal(rawAgentMetadataSchema, { name: 42, services: 'not-an-array' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('fails safely on completely unexpected shapes (array, null, string)', () => {
    for (const bad of [null, [], 'a string', 42, true]) {
      const result = parseExternal(rawAgentMetadataSchema, bad);
      expect(result.ok).toBe(false);
    }
  });

  it('preserves unknown extra fields via passthrough without trusting them', () => {
    const result = parseExternal(rawAgentMetadataSchema, {
      name: 'Test',
      someFutureField: { nested: true },
    });
    expect(result.ok).toBe(true);
  });
});

describe('parseExternalJsonText', () => {
  it('fails safely on invalid JSON text rather than throwing', () => {
    const result = parseExternalJsonText(rawAgentMetadataSchema, '{not valid json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/invalid JSON/);
  });

  it('parses valid JSON text and then schema-validates it', () => {
    const result = parseExternalJsonText(rawAgentMetadataSchema, JSON.stringify({ name: 'ok' }));
    expect(result.ok).toBe(true);
  });
});
