import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@pluma/db';

const SDK_TOKEN_PREFIX = 'plm_sdk_';

// SDK tokens are generated once and stored hashed to avoid plaintext persistence.
export const generateSdkToken = () =>
  `${SDK_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;

export const hashSdkToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const parseBearerToken = (headerValue?: string) => {
  if (!headerValue) {
    return null;
  }

  const [scheme, value] = headerValue.split(' ');

  if (scheme !== 'Bearer' || !value) {
    return null;
  }

  return value.trim();
};

export const requireSdkToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = parseBearerToken(request.headers.authorization);

  if (!token || !token.startsWith(SDK_TOKEN_PREFIX)) {
    return reply.unauthorized('SDK token required');
  }

  const tokenHash = hashSdkToken(token);
  const sdkToken = await prisma.sdkToken.findUnique({
    where: { tokenHash },
    include: { environment: { select: { id: true, projectId: true } } },
  });

  if (!sdkToken) {
    return reply.unauthorized('Invalid SDK token');
  }

  request.sdk = {
    environmentId: sdkToken.environmentId,
    projectId: sdkToken.environment.projectId,
    tokenId: sdkToken.id,
  };
};
