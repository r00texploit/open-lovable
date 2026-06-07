import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { customDomainSchema } from '@/lib/validations/site';
import { addDomainToProject } from '@/lib/vercel';
import { toSiteDto } from '@/lib/tenancy/site-dto';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const site = await prisma.site.findFirst({
    where: {
      id,
      userId: auth.user.id,
    },
  });

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = customDomainSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid domain' }, { status: 400 });
  }

  const domain = parsed.data.domain;
  const existing = await prisma.site.findFirst({
    where: {
      id: { not: site.id },
      customDomain: domain,
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'That custom domain is already in use' }, { status: 409 });
  }

  const result = await addDomainToProject(domain);
  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      customDomain: domain,
      customDomainVerified: result.verified,
      domainStatus: result.verified ? 'verified' : 'pending_verification',
    },
  });

  return NextResponse.json({
    site: toSiteDto(updated),
    verification: result.verification || [],
  });
}
