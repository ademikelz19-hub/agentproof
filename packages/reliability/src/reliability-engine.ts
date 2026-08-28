/**
 * Reliability engine (build prompt Phase E).
 *
 * Pure functions of `(ProbeObservation[]) -> ReliabilityWindow`. No I/O —
 * callers (API routes, future dashboards) fetch observations via
 * `ObservationRepository` and pass them in here. This is what makes the
 * formulas independently testable and reproducible: given the same
 * observation rows, this always produces the same result.
 *
 * Full formula documentation lives in docs/RELIABILITY_METHODOLOGY.md —
 * keep that file in sync with any change here.
 */

import {
  METHODOLOGY_VERSIONS,
  type EvidenceSufficiency,
  type ProbeObservation,
  type ProbeOutcome,
  type ReliabilityWindow,
  type ReliabilityWindowSize,
} from '@agentproof/core';

/**
 * Outcomes that are evidence ABOUT THE AGENT's service (it was reachable,
 * or it demonstrably wasn't). These are the only outcomes that feed
 * availability/failure calculations.
 */
const AGENT_ATTRIBUTABLE_OUTCOMES: ReadonlySet<ProbeOutcome> = new Set([
  'SUCCESS',
  'AGENT_UNREACHABLE',
  'DNS_FAILURE',
  'TIMEOUT',
  'PROTOCOL_INVALID',
]);

/**
 * Outcomes that reflect AgentProof's own tooling/policy/upstream failure,
 * not a fact about the agent (build prompt section 29 — never let an
 * upstream indexer outage make an agent look unreliable). Excluded
 * entirely from reliability math.
 */
const EXCLUDED_OUTCOMES: ReadonlySet<ProbeOutcome> = new Set([
  'UPSTREAM_INDEXER_FAILURE',
  'AGENTPROOF_INTERNAL_ERROR',
  'BLOCKED_BY_SECURITY_POLICY',
]);

const WINDOW_MS: Record<ReliabilityWindowSize, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// --- Evidence sufficiency thresholds (documented in RELIABILITY_METHODOLOGY.md) ---
const MIN_OBSERVATIONS_FOR_ANY_DISPLAY = 3;
const MIN_OBSERVATIONS_FOR_MODERATE = 10;
const MIN_OBSERVATIONS_FOR_STRONG = 30;
const MIN_SPAN_RATIO_FOR_MODERATE = 0.25;
const MIN_SPAN_RATIO_FOR_STRONG = 0.75;
/** If the most recent observation is older than this fraction of the window, evidence is treated as stale regardless of count. */
const MAX_STALENESS_RATIO = 0.5;

function median(sorted: number[]): number | undefined {
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const a = sorted[mid - 1];
    const b = sorted[mid];
    return a !== undefined && b !== undefined ? (a + b) / 2 : undefined;
  }
  return sorted[mid];
}

/** Nearest-rank method: the smallest value such that at least 95% of observations are <= it. */
function p95(sorted: number[]): number | undefined {
  if (sorted.length === 0) return undefined;
  const rank = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.min(rank, sorted.length - 1)];
}

function classifySufficiency(
  observationCount: number,
  spanRatio: number,
  stalenessRatio: number,
): EvidenceSufficiency {
  if (observationCount < MIN_OBSERVATIONS_FOR_ANY_DISPLAY) return 'INSUFFICIENT';
  if (stalenessRatio > MAX_STALENESS_RATIO) return 'INSUFFICIENT';

  let tier: EvidenceSufficiency;
  if (observationCount >= MIN_OBSERVATIONS_FOR_STRONG) tier = 'STRONG';
  else if (observationCount >= MIN_OBSERVATIONS_FOR_MODERATE) tier = 'MODERATE';
  else tier = 'LIMITED';

  if (tier === 'STRONG' && spanRatio < MIN_SPAN_RATIO_FOR_STRONG) tier = 'MODERATE';
  if (tier === 'MODERATE' && spanRatio < MIN_SPAN_RATIO_FOR_MODERATE) tier = 'LIMITED';
  return tier;
}

export interface ComputeReliabilityWindowParams {
  agentId: string;
  serviceId?: string;
  window: ReliabilityWindowSize;
  /** All observations available for consideration — the function filters to the window itself, callers do not need to pre-filter by time. */
  observations: ProbeObservation[];
  now: Date;
  methodologyVersion?: string;
}

export function computeReliabilityWindow(params: ComputeReliabilityWindowParams): ReliabilityWindow {
  const { agentId, serviceId, window, now } = params;
  const methodologyVersion = params.methodologyVersion ?? METHODOLOGY_VERSIONS.reliability;
  const windowMs = WINDOW_MS[window];
  const windowStart = now.getTime() - windowMs;

  const inWindow = params.observations.filter((o) => {
    if (o.agentId !== agentId) return false;
    if (serviceId && o.serviceId !== serviceId) return false;
    const t = new Date(o.timestamp).getTime();
    return t >= windowStart && t <= now.getTime();
  });

  const attributable = inWindow.filter((o) => AGENT_ATTRIBUTABLE_OUTCOMES.has(o.outcome));
  // Excluded observations are computed for documentation/debugging purposes
  // only; they never enter the math below.
  void inWindow.filter((o) => EXCLUDED_OUTCOMES.has(o.outcome));

  const successes = attributable.filter((o) => o.outcome === 'SUCCESS');
  const failures = attributable.filter((o) => o.outcome !== 'SUCCESS');

  const observationCount = attributable.length;
  const successCount = successes.length;
  const failureCount = failures.length;

  const availabilityPct =
    observationCount > 0 ? (successCount / observationCount) * 100 : undefined;

  const successLatencies = successes
    .map((o) => o.latencyMs)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b);

  const medianLatencyMs = median(successLatencies);
  const p95LatencyMs = p95(successLatencies);

  const sortedByTimeDesc = [...attributable].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  let consecutiveFailures = 0;
  for (const o of sortedByTimeDesc) {
    if (o.outcome === 'SUCCESS') break;
    consecutiveFailures += 1;
  }

  const lastProbeAt = sortedByTimeDesc[0]?.timestamp;
  const lastSuccessfulProbeAt = successes
    .map((o) => o.timestamp)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const earliestTimestamp = attributable.length
    ? Math.min(...attributable.map((o) => new Date(o.timestamp).getTime()))
    : undefined;
  const spanMs =
    earliestTimestamp !== undefined && lastProbeAt
      ? new Date(lastProbeAt).getTime() - earliestTimestamp
      : 0;
  const spanRatio = windowMs > 0 ? spanMs / windowMs : 0;

  const stalenessRatio = lastProbeAt
    ? (now.getTime() - new Date(lastProbeAt).getTime()) / windowMs
    : Number.POSITIVE_INFINITY;

  const dataSufficiency = classifySufficiency(observationCount, spanRatio, stalenessRatio);

  return {
    agentId,
    ...(serviceId ? { serviceId } : {}),
    window,
    sufficientData: dataSufficiency !== 'INSUFFICIENT',
    dataSufficiency,
    observationCount,
    successCount,
    failureCount,
    ...(availabilityPct !== undefined ? { availabilityPct } : {}),
    ...(medianLatencyMs !== undefined ? { medianLatencyMs } : {}),
    ...(p95LatencyMs !== undefined ? { p95LatencyMs } : {}),
    ...(lastSuccessfulProbeAt ? { lastSuccessfulProbeAt } : {}),
    ...(lastProbeAt ? { lastProbeAt } : {}),
    consecutiveFailures,
    methodologyVersion,
    computedAt: now.toISOString(),
  };
}

export function computeAllWindows(
  params: Omit<ComputeReliabilityWindowParams, 'window'>,
): Record<ReliabilityWindowSize, ReliabilityWindow> {
  return {
    '24h': computeReliabilityWindow({ ...params, window: '24h' }),
    '7d': computeReliabilityWindow({ ...params, window: '7d' }),
    '30d': computeReliabilityWindow({ ...params, window: '30d' }),
  };
}
