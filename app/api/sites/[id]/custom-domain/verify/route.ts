import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { verifyVpsDomain } from '@/lib/vps-hosting';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
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

  if (!site || !site.customDomain) {
    return NextResponse.json({ error: 'Site or custom domain not found' }, { status: 404 });
  }

  const verified = await verifyVpsDomain(site.customDomain);
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
    verification: verified
      ? []
      : [
          {
            type: 'A',
            domain: site.customDomain,
            value: process.env.VPS_PUBLIC_IP || 'Set an A record pointing to your VPS IP',
            reason: 'Domain must resolve to the VPS IP',
          },
        ],
  });
}
