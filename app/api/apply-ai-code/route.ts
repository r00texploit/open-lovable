import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been retired. Use /api/apply-ai-code-stream.',
    },
    { status: 410 }
  );
}
