import { type NextRequest, NextResponse } from 'next/server';
import { createProxyHandler, type ProxyContext } from '@/lib/proxy-handler';

const handler = (request: NextRequest, context: ProxyContext): Promise<NextResponse> =>
  createProxyHandler(request, context, 'api/v1');

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
