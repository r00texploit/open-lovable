import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { isSecretVaultConfigured } from '@/lib/crypto/secret-box';
import {
  detectProviderFromKey,
  listCredentials,
  revokeCredential,
  storeCredential,
} from '@/lib/ai/credentials';

export const dynamic = 'force-dynamic';

// GET /api/ai/keys — list the caller's stored AI keys (masked; never the secret)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const credentials = await listCredentials(session.user.id);
  return NextResponse.json({ credentials });
}

// POST /api/ai/keys — store/rotate an AI provider key. Body: { apiKey, siteId? }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSecretVaultConfigured()) {
    return NextResponse.json(
      { error: 'Secret vault not configured (SECRETS_ENCRYPTION_KEY missing)' },
      { status: 500 },
    );
  }

  const { apiKey, siteId } = await request.json();
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
  }

  const provider = detectProviderFromKey(apiKey);
  if (!provider) {
    return NextResponse.json({ error: 'Unrecognized API key format' }, { status: 400 });
  }

  // If a siteId is supplied it must belong to the caller.
  let validSiteId: string | null = null;
  if (siteId && typeof siteId === 'string') {
    const { prisma } = await import('@/lib/db/prisma');
    const owned = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    validSiteId = owned.id;
  }

  const stored = await storeCredential({
    userId: session.user.id,
    apiKey,
    provider,
    siteId: validSiteId,
  });

  // proxyToken is returned to the authenticated owner so the generated site can
  // be wired up; it is not a bearer secret for the raw key.
  return NextResponse.json({
    credential: {
      id: stored.id,
      provider: stored.provider,
      siteId: stored.siteId,
      last4: stored.last4,
      proxyToken: stored.proxyToken,
    },
  });
}

// DELETE /api/ai/keys — revoke a stored key. Body: { id }
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const revoked = await revokeCredential(session.user.id, id);
  if (!revoked) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
