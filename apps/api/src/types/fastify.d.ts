import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: {
      userId: string;
      role: 'admin';
    };
    sdk?: {
      environmentId: string;
      projectId: string;
      tokenId: string;
    };
  }
}
