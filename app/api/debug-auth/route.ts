import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/get-auth-user';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  return NextResponse.json({
    authenticated: !!user,
    user: user || null,
  });
}
