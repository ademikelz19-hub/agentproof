import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
};

export function apiError(code: ApiErrorCode, message: string): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status: STATUS_BY_CODE[code] });
}

/**
 * Every successful response carries these — methodology version and a
 * generation timestamp — so a consumer always knows when and under what
 * calculation rules the data was produced.
 */
export interface ApiEnvelope<T> {
  data: T;
  generatedAt: string;
}

export function apiOk<T>(data: T, init?: { cacheSeconds?: number }): NextResponse<ApiEnvelope<T>> {
  const res = NextResponse.json<ApiEnvelope<T>>({ data, generatedAt: new Date().toISOString() });
  if (init?.cacheSeconds) {
    res.headers.set(
      'Cache-Control',
      `public, max-age=0, s-maxage=${init.cacheSeconds}, stale-while-revalidate=${init.cacheSeconds}`,
    );
  }
  return res;
}
