import { type NextRequest, NextResponse } from 'next/server';
import { createProxyHandler } from '@/lib/proxy-handler';

const handler = (request: NextRequest): Promise<NextResponse> => createProxyHandler(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler;
