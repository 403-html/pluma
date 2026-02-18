import { prisma } from '../src/index';

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
