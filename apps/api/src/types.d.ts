import type { AuthUser } from '@pluma/types';

declare module 'fastify' {
  interface FastifyRequest {
    sessionUserId?: string;
    sessionUser?: AuthUser;
    sdkProjectId?: string;
  }
}
