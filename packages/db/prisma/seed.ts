import { prisma } from '../src/index';
import { hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('Start seeding...');
  
  // Example: Create or update a project (idempotent)
  const project = await prisma.project.upsert({
    where: {
      key: 'demo',
    },
    update: {
      name: 'Demo Project',
    },
    create: {
      key: 'demo',
      name: 'Demo Project',
    },
  });
  
  console.log('Upserted project:', project);

  // Create or update admin user (idempotent)
  // WARNING: This default admin is intended for development only.
  // In production, seeding this known credential is blocked by default
  // unless ALLOW_DEFAULT_ADMIN_SEED=true is explicitly set.
  const shouldSeedDefaultAdmin =
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_DEFAULT_ADMIN_SEED === 'true';

  if (!shouldSeedDefaultAdmin) {
    console.warn(
      'Skipping default admin seeding in production. ' +
        'Set ALLOW_DEFAULT_ADMIN_SEED=true to override (not recommended).',
    );
  } else {
    const hashedPassword = await hash('Admin1234!', BCRYPT_ROUNDS);
    const adminUser = await prisma.user.upsert({
      where: {
        email: 'admin@pluma.dev',
      },
      update: {
        passwordHash: hashedPassword,
      },
      create: {
        email: 'admin@pluma.dev',
        passwordHash: hashedPassword,
      },
    });
  
    console.log('Upserted admin user:', adminUser.id, adminUser.email);
  }
  
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
