import { prisma } from '../src/index';

async function main() {
  console.log('Start seeding...');
  
  // Example: Create a project
  const project = await prisma.project.create({
    data: {
      key: 'demo',
      name: 'Demo Project',
    },
  });
  
  console.log('Created project:', project);
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
