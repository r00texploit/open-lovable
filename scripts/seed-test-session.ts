import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'test@openlovable.dev' },
    include: { sessions: true }
  });

  if (!user) {
    console.error('Test user not found');
    process.exit(1);
  }

  console.log('User ID:', user.id);
  console.log('Existing sessions:', user.sessions.length);

  if (user.sessions.length === 0) {
    const session = await prisma.session.create({
      data: {
        sessionToken: 'test-session-token-for-api-testing-12345',
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    });
    console.log('Created test session:', session.sessionToken.slice(0, 20) + '...');
  } else {
    console.log('Session already exists');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
