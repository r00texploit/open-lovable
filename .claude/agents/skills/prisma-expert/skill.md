# Prisma Expert Skill

## Schema Design

### Relations
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  profile   Profile?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Profile {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  bio    String?
}

model Post {
  id       String @id @default(cuid())
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
  title    String
  content  String?
}
```

### Enums
```prisma
enum Role {
  USER
  ADMIN
  MODERATOR
}

enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model User {
  id     String @id @default(cuid())
  role   Role   @default(USER)
  status Status @default(DRAFT)
}
```

### Indexes
```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  createdAt DateTime @default(now())
  
  @@index([createdAt])
  @@index([title])
  @@fulltext([title, content]) // MySQL only
}
```

## Client Usage

### Singleton Pattern
```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Transactions
```typescript
// Sequential transactions
const result = await prisma.$transaction([
  prisma.user.create({ data: { email: 'test@example.com' } }),
  prisma.profile.create({ data: { bio: 'Hello', userId: '...' } }),
]);

// Interactive transactions
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email: 'test@example.com' } });
  await tx.profile.create({ 
    data: { bio: 'Hello', userId: user.id } 
  });
});
```

### Nested Queries
```typescript
// Include relations
const users = await prisma.user.findMany({
  include: {
    profile: true,
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    },
  },
});

// Select specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    profile: {
      select: { bio: true },
    },
  },
});
```

## Migrations

### Workflow
```bash
# Create migration
npx prisma migrate dev --name add_user_role

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Generate client
npx prisma generate
```

### Seed Script
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      role: 'ADMIN',
    },
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

## Best Practices

### Use Type-Safe Queries
```typescript
// ✅ Type-safe
const user = await prisma.user.findUnique({
  where: { id: userId },
});

// ❌ Not type-safe
const user = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
```

### Soft Deletes
```prisma
model User {
  id        String    @id @default(cuid())
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

```typescript
// Soft delete
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: new Date() },
});

// Query active users
await prisma.user.findMany({
  where: { deletedAt: null },
});
```

### Connection Pooling (Serverless)
```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });
```

## Project-Specific: Noeron
- Uses Prisma with Neon adapter for serverless
- Schema in /prisma/schema.prisma
- Connection pooling for Vercel serverless functions
- RLS policies for multi-tenancy
