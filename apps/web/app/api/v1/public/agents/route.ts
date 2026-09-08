import type { NextRequest } from 'next/server';
import { db, agents } from '@agentproof/db';
import { apiError } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/pagination';
import { normalizeChain } from '@/lib/api/agent-params';
import { and, desc, eq, lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = parsePagination(searchParams);
  if (!pagination.ok) {
    return apiError('VALIDATION_ERROR', pagination.error);
  }

  const chainParam = searchParams.get('chain') ?? undefined;
  const normalizedChain = chainParam ? normalizeChain(chainParam) : undefined;
  if (chainParam && !normalizedChain) {
    return apiError('VALIDATION_ERROR', `Unsupported chain: ${chainParam}. Supported chains: bsc (56)`);
  }

  const conditions = [
    normalizedChain ? eq(agents.chain, normalizedChain) : undefined,
    pagination.value.cursor ? lt(agents.id, pagination.value.cursor) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const limit = pagination.value.limit;
  const rows = await db
    .select()
    .from(agents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(agents.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : undefined;

  const enrichedItems = pageRows.map((r) => ({
    id: r.id,
    chain: r.chain,
    onchainId: r.onchainId,
    registryAddress: r.registryAddress ?? '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
    name: r.name ?? `Agent #${r.onchainId}`,
    description: r.description ?? null,
    metadataUri: r.metadataUri ?? null,
    metadataResolved: r.metadataResolved,
    
    // EVM & ERC-8004 compatibility fields (what AgentFlow, viem, wagmi, 8004scan use):
    token_id: r.onchainId,
    chain_id: 56,
    contract_address: r.registryAddress ?? '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',

    provenance: {
      source: r.provenanceSource,
      origin: r.provenanceOrigin,
      observedAt: r.lastIngestedAt ? new Date(r.lastIngestedAt).toISOString() : new Date().toISOString(),
    },
  }));

  const generatedAt = new Date().toISOString();

  // If the caller requested an envelope format (e.g. ?format=envelope)
  if (searchParams.get('format') === 'envelope') {
    return NextResponse.json(
      {
        data: {
          items: enrichedItems,
          nextCursor,
        },
        items: enrichedItems,
        nextCursor,
        generatedAt,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=30',
        },
      }
    );
  }

  // Default: data is an ARRAY so data.map(...) works directly for frontend frameworks (AgentFlow, 8004scan consumers)
  return NextResponse.json(
    {
      success: true,
      data: enrichedItems,
      items: enrichedItems,
      nextCursor,
      pagination: {
        limit,
        nextCursor,
        hasMore,
      },
      generatedAt,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=30',
      },
    }
  );
}
