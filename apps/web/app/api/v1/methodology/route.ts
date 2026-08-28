import { METHODOLOGY_VERSIONS } from '@agentproof/core';
import { apiOk } from '@/lib/api/response';

export async function GET() {
  return apiOk(
    {
      methodologyVersions: METHODOLOGY_VERSIONS,
      documentation: {
        reliability: '/methodology#reliability',
        reputationIntegrity: '/methodology#reputation-integrity',
        probePolicy: '/methodology#probe-policy',
      },
    },
    { cacheSeconds: 300 },
  );
}
