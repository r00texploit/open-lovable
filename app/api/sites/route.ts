import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { createSiteSchema, slugSchema } from '@/lib/validations/site';
import { toSiteDto } from '@/lib/tenancy/site-dto';
import { extractSiteNameFromPrompt, slugifySiteName } from '@/lib/tenancy/site-naming';

export async function GET() {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sites = await prisma.site.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    sites: sites.map(toSiteDto),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const requestedName = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const requestedSlug = typeof payload?.slug === 'string' ? payload.slug.trim() : '';
  const prompt = typeof payload?.prompt === 'string' ? payload.prompt : '';
  const sourceUrl = typeof payload?.sourceUrl === 'string' ? payload.sourceUrl : '';
  const name = requestedName || extractSiteNameFromPrompt({ prompt, sourceUrl });
  const shouldAutoSlug = !requestedSlug;
  const baseSlug = requestedSlug || slugifySiteName(name);
  const parsedSlug = slugSchema.safeParse(baseSlug);

  if (!parsedSlug.success) {
    return NextResponse.json({ error: parsedSlug.error.errors[0]?.message || 'Invalid slug' }, { status: 400 });
  }

  const slug = shouldAutoSlug
    ? await generateUniqueSlug(parsedSlug.data)
    : parsedSlug.data;

  const parsed = createSiteSchema.safeParse({ name, slug });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid site data' }, { status: 400 });
  }

  const existing = await prisma.site.findFirst({
    where: {
      OR: [{ slug: parsed.data.slug }, { subdomain: parsed.data.slug }],
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'That site slug is already taken' }, { status: 409 });
  }

  const site = await prisma.site.create({
    data: {
      userId: auth.user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      subdomain: parsed.data.slug,
    },
  });

  return NextResponse.json({ site: toSiteDto(site) }, { status: 201 });
}

async function generateUniqueSlug(baseSlug: string) {
  const root = baseSlug.slice(0, 44).replace(/-+$/g, '') || 'site';

  for (let index = 0; index < 100; index++) {
    const candidate = index === 0 ? root : `${root}-${index + 1}`;
    const existing = await prisma.site.findFirst({
      where: {
        OR: [{ slug: candidate }, { subdomain: candidate }],
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${root}-${Date.now().toString(36).slice(-6)}`.slice(0, 50).replace(/-+$/g, '');
}
