import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'test@openlovable.dev' } });
  if (existing) {
    console.log('Test user already exists:', existing.id);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: 'test@openlovable.dev',
      name: 'Test User',
      password: null,
      subscription: {
        create: {
          tier: 'pro',
          status: 'active',
        }
      },
      usage: {
        create: {
          generationsUsed: 0,
          generationsLimit: 500000,
        }
      }
    }
  });

  console.log('Created test user:', user.id, user.email);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
