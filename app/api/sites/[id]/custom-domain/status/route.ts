import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { addDomainToVps, getVpsVerificationRecords, verifyVpsDomain } from '@/lib/vps-hosting';
import { removeDomainFromVps } from '@/lib/vps-hosting';
import { randomBytes } from 'node:crypto';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let site = await prisma.site.findFirst({
    where: {
      id,
      userId: auth.user.id,
    },
  });

  if (!site || !site.customDomain) {
    return NextResponse.json({ error: 'Site or custom domain not found' }, { status: 404 });
  }
  if (!site.domainVerificationToken) {
    const token = randomBytes(24).toString('base64url');
    await removeDomainFromVps(site.customDomain).catch(() => undefined);
    site = await prisma.site.update({
      where: { id: site.id },
      data: { customDomainVerified: false, domainStatus: 'pending_verification', domainVerificationToken: token },
    });
  }
  const domain = site.customDomain!;
  const verificationToken = site.domainVerificationToken!;

  // Re-check DNS instead of treating verification as permanent. This prevents
  // a domain that changes ownership later from inheriting a stale route/TLS
  // authorization from its previous owner.
  const verified = await verifyVpsDomain(domain, verificationToken);
  if (!verified && site.customDomainVerified) {
    await removeDomainFromVps(domain).catch((error) => {
      console.error('[custom-domain/status] Failed to deactivate stale domain route:', error);
    });
  }
  if (verified && site.published) {
    await addDomainToVps(domain, site.id, verificationToken);
  }
  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      customDomainVerified: verified,
      domainStatus: verified ? 'verified' : 'pending_verification',
    },
  });

  return NextResponse.json({
    site: {
      id: updated.id,
      customDomain: updated.customDomain,
      customDomainVerified: updated.customDomainVerified,
      domainStatus: updated.domainStatus,
    },
    verification: verified ? [] : getVpsVerificationRecords(domain, verificationToken),
  });
}
