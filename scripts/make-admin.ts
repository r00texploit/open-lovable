import { PrismaClient } from '@prisma/client';

/**
 * Promote (or demote) a user's role.
 *
 * Usage:
 *   npx tsx scripts/make-admin.ts <email>            # promote to admin
 *   npx tsx scripts/make-admin.ts <email> --demote  # back to regular user
 *
 * Email matching is case-insensitive (the DB stores emails lowercased).
 * The user must already exist; sign-up first, then promote.
 */
const prisma = new PrismaClient();

async function main() {
  const [, , emailArg, ...rest] = process.argv;
  const demote = rest.includes('--demote');

  if (!emailArg) {
    console.error('Usage: npx tsx scripts/make-admin.ts <email> [--demote]');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found for email: ${email}`);
    console.error('The user must sign up first, then be promoted.');
    process.exit(1);
  }

  const role = demote ? 'user' : 'admin';
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  console.log(
    `✓ ${demote ? 'Demoted' : 'Promoted'} ${updated.email} (id: ${updated.id}) -> role: ${updated.role}`,
  );
  if (!demote) {
    console.log('  The user must sign out and back in (or wait for JWT refresh) for the change to take effect.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });