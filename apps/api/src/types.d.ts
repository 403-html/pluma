import type { AuthUser } from '@pluma-flags/types';

declare module 'fastify' {
  interface FastifyRequest {
    sessionUserId?: string;
    sessionUser?: AuthUser;
    sdkProjectId?: string;
    sdkEnvId?: string;
  }
}
