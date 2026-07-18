import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { customDomainSchema } from '@/lib/validations/site';
import { getVpsVerificationRecords, removeDomainFromVps } from '@/lib/vps-hosting';
import { toSiteDto } from '@/lib/tenancy/site-dto';
import { randomBytes } from 'node:crypto';

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
  const rootDomain = (process.env.VPS_BASE_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase();
  if (rootDomain && (domain === rootDomain || domain.endsWith(`.${rootDomain}`))) {
    return NextResponse.json({ error: 'Platform subdomains cannot be registered as custom domains' }, { status: 400 });
  }
  const existing = await prisma.site.findFirst({
    where: {
      id: { not: site.id },
      customDomain: domain,
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'That custom domain is already in use' }, { status: 409 });
  }

  if (site.customDomain && site.customDomainVerified) {
    await removeDomainFromVps(site.customDomain);
  }
  const verificationToken = randomBytes(24).toString('base64url');
  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      customDomain: domain,
      customDomainVerified: false,
      domainVerificationToken: verificationToken,
      domainStatus: 'pending_verification',
    },
  });

  return NextResponse.json({
    site: toSiteDto(updated),
    verification: getVpsVerificationRecords(domain, verificationToken),
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const site = await prisma.site.findFirst({ where: { id, userId: auth.user.id } });
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (site.customDomain) await removeDomainFromVps(site.customDomain);
  const updated = await prisma.site.update({
    where: { id: site.id },
    data: { customDomain: null, customDomainVerified: false, domainVerificationToken: null, domainStatus: 'unconfigured' },
  });
  return NextResponse.json({ site: toSiteDto(updated) });
}
