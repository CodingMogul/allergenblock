import { NextResponse } from 'next/server';
import { fetchLogoUrl } from '@/lib/logoService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
  }
  const logo = await fetchLogoUrl(name);
  return NextResponse.json({ logo: logo ?? null });
} 