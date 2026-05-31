import { prisma } from '../lib/db/prisma';

async function initDb() {
  console.log('Initializing database...');

  // Create test users if they don't exist
  const testUsers = [
    {
      email: 'test@example.com',
      name: 'Test User',
      tier: 'free',
      generationsLimit: 3,
    },
    {
      email: 'pro@example.com',
      name: 'Pro User',
      tier: 'pro',
      generationsLimit: 100,
    },
  ];

  for (const testUser of testUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    if (!existingUser) {
      console.log(`Creating test user: ${testUser.email}`);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          subscription: {
            create: {
              tier: testUser.tier,
              status: testUser.tier === 'free' ? 'inactive' : 'active',
            },
          },
          usage: {
            create: {
              generationsLimit: testUser.generationsLimit,
              generationsUsed: 0,
            },
          },
        },
      });
      console.log(`Created user: ${user.id}`);
    } else {
      console.log(`User already exists: ${testUser.email}`);
    }
  }

  console.log('Database initialized!');
}

initDb()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });