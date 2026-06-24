# Next.js Expert Skill

## Architecture Patterns

### App Router Best Practices
- Use `loading.tsx` for loading states
- Use `error.tsx` for error boundaries
- Use `layout.tsx` for shared UI
- Use `page.tsx` for route-specific content
- Use `route.ts` for API endpoints

### Data Fetching
```typescript
// Server Components (default)
async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data}</div>;
}

// Client Components
'use client';
import useSWR from 'swr';
function Page() {
  const { data } = useSWR('/api/data', fetcher);
  return <div>{data}</div>;
}
```

### Route Handlers
```typescript
// app/api/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ received: body }, { status: 201 });
}
```

### Middleware Patterns
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check auth, rate limiting, etc.
  const token = request.cookies.get('token');
  if (!token && request.nextUrl.pathname.startsWith('/api/protected')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
```

## Performance Optimization

### Streaming & Suspense
```typescript
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SlowComponent />
    </Suspense>
  );
}
```

### Dynamic Imports
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Disable SSR if needed
});
```

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={800}
  height={600}
  priority // For LCP images
  loading="eager"
/>
```

## Caching Strategies

### fetch() Options
```typescript
// Static (cached at build time)
fetch('https://api.example.com/data');

// Dynamic (no cache)
fetch('https://api.example.com/data', { cache: 'no-store' });

// Revalidated
fetch('https://api.example.com/data', {
  next: { revalidate: 60 }, // ISR every 60 seconds
});
```

### Route Segment Config
```typescript
export const dynamic = 'force-dynamic'; // No caching
export const revalidate = 3600; // ISR every hour
export const fetchCache = 'force-no-store';
```

## Common Patterns

### Parallel Data Fetching
```typescript
export default async function Page() {
  const [user, posts, settings] = await Promise.all([
    getUser(),
    getPosts(),
    getSettings(),
  ]);
  return <Dashboard user={user} posts={posts} settings={settings} />;
}
```

### Search Params Handling
```typescript
export default function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page = Number(searchParams.page) || 1;
  return <div>Page {page}</div>;
}
```

### Error Handling
```typescript
// error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Deployment (Vercel)

### Environment Variables
- `NEXT_PUBLIC_*` - Exposed to browser
- Regular vars - Server only

### Build Settings
```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

## Troubleshooting

### Common Errors
1. **window is not defined** → Use dynamic import with `ssr: false`
2. **Hydration mismatch** → Check for browser-only APIs in server render
3. **API 404** → Check file path matches route structure
4. **Build fails** → Clear `.next` cache, check for circular dependencies

## Project-Specific: Noeron
- Uses Next.js 15 with App Router
- Turbopack enabled in dev (`--turbopack`)
- API routes in `app/api/**/route.ts`
- Custom sandbox integration in API routes
