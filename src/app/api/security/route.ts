import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import type { Address } from 'viem';
import { scanTokenSecurity } from '@/lib/security-scanner';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');

  if (!address || !isAddress(address)) {
    return NextResponse.json({ success: false, error: 'Valid contract address is required' }, { status: 400 });
  }

  try {
    const result = await scanTokenSecurity(address as Address);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Security scan failed' },
      { status: 500 }
    );
  }
}
