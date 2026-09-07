import { agentRepository, observationRepository } from '@/lib/api/repositories';
import { parseAgentParams } from '@/lib/api/agent-params';
import { computeReliabilityWindow } from '@agentproof/reliability';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string; id: string }> },
) {
  const parsed = parseAgentParams(await params);
  if (!parsed.ok) {
    return new Response(generateBadgeSvg('AgentProof', 'invalid id', '#e11d48'), {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const agent = await agentRepository.getAgent(parsed.value.chain, parsed.value.id);
  if (!agent) {
    return new Response(generateBadgeSvg('AgentProof', 'agent not found', '#64748b'), {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const page = await observationRepository.listObservations({
    agentId: agent.id,
    since,
    until: now.toISOString(),
    limit: 500,
  });

  const win24 = computeReliabilityWindow({ agentId: agent.id, window: '24h', observations: page.items, now });

  let valueText = 'standby';
  let color = '#64748b'; // muted gray

  if (win24.observationCount > 0) {
    if (win24.availabilityPct !== null && win24.availabilityPct !== undefined) {
      const pct = win24.availabilityPct.toFixed(1);
      const lat = win24.medianLatencyMs ? ` · ${win24.medianLatencyMs}ms` : '';
      valueText = `${pct}% uptime${lat}`;
      if (win24.availabilityPct >= 90) color = '#10b981'; // emerald green
      else if (win24.availabilityPct >= 70) color = '#f59e0b'; // amber
      else color = '#f43f5e'; // rose red
    } else {
      valueText = 'untested';
      color = '#64748b';
    }
  }

  const svg = generateBadgeSvg('AgentProof', valueText, color);

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function generateBadgeSvg(label: string, value: string, color: string): string {
  const charWidth = 7;
  const labelWidth = Math.round(label.length * charWidth + 14);
  const valueWidth = Math.round(value.length * charWidth + 16);
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const labelX = Math.round(labelWidth / 2);
  const valueX = Math.round(labelWidth + valueWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" role="img" aria-label="${label}: ${value}">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <rect width="${labelWidth}" height="${height}" fill="#181b26"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelX * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${label}</text>
    <text x="${labelX * 10}" y="140" fill="#f0b90b" font-weight="bold" transform="scale(.1)">${label}</text>
    <text aria-hidden="true" x="${valueX * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${value}</text>
    <text x="${valueX * 10}" y="140" transform="scale(.1)">${value}</text>
  </g>
</svg>`;
}
