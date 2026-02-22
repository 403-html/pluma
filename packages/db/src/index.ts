import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required and cannot be empty');
}

const adapter = new PrismaPg({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';

// ---------------------------------------------------------------------------
// Derived API response types
// ---------------------------------------------------------------------------

// Select args used by GET /api/v1/projects — kept here so the returned type
// is always in sync with the Prisma schema rather than hand-maintained.
const _projectSummaryArgs = {
  select: {
    id: true,
    key: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    environments: { select: { id: true, key: true, name: true } },
  },
} satisfies Prisma.ProjectDefaultArgs;

type _ProjectBase = Prisma.ProjectGetPayload<typeof _projectSummaryArgs>;

/**
 * JSON-serialised project as returned by `GET /api/v1/projects`.
 * Derived from the Prisma schema — field types stay in sync automatically.
 * `createdAt`/`updatedAt` are `string` because JSON serialisation converts `Date`.
 */
export type ProjectSummary = Omit<_ProjectBase, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  flagStats: { enabled: number; total: number };
};
