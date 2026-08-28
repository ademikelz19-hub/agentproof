/**
 * SYNTHETIC TEST FIXTURE — NOT A REAL 8004SCAN RESPONSE.
 *
 * This data was invented for testing the validation/normalization
 * pipeline. It has NOT been observed from a live 8004scan response (this
 * sandbox cannot reach 8004scan — see docs/ENVIRONMENT_BASELINE.md).
 *
 * Rules enforced by naming/location convention:
 *   - Filename is prefixed `synthetic-` and lives under `__fixtures__/`.
 *   - Nothing under `__fixtures__/` is re-exported from `src/index.ts`.
 *   - Grep the repo for `synthetic-8004scan` before any release to confirm
 *     this file is only imported by `*.test.ts` files.
 */

export const SYNTHETIC_8004SCAN_RESPONSE_WITH_SERVICES = {
  name: 'Synthetic Test Agent (services form)',
  description: 'A fabricated fixture agent for adapter/normalization tests only.',
  services: [
    { id: 'svc-1', type: 'HTTP', url: 'https://example-agent.test/api' },
    { id: 'svc-2', protocol: 'A2A', url: 'https://example-agent.test/a2a' },
  ],
};

export const SYNTHETIC_8004SCAN_RESPONSE_WITH_LEGACY_ENDPOINTS = {
  name: 'Synthetic Test Agent (legacy endpoints form)',
  endpoints: [{ id: 'ep-1', type: 'HTTP', endpoint: 'https://legacy-agent.test/api' }],
};

export const SYNTHETIC_8004SCAN_RESPONSE_WITH_BOTH = {
  name: 'Synthetic Test Agent (both forms — services must win)',
  services: [{ id: 'svc-1', type: 'HTTP', url: 'https://preferred.test/api' }],
  endpoints: [{ id: 'ep-1', type: 'HTTP', endpoint: 'https://should-be-ignored.test/api' }],
};

export const SYNTHETIC_MALFORMED_RESPONSE = {
  name: 42, // wrong type on purpose — must fail schema validation
  services: 'not-an-array',
};
