import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { admin } from '@/lib/firebase-admin';
import type { MarketingEvent } from '@/lib/marketing/types';

const ALLOWED_TYPES: MarketingEvent['type'][] = [
  'book_consult_click',
  'contact_submit',
  'service_inquiry_submit',
];

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(payload.type)) {
    return NextResponse.json({ ok: false, error: 'Invalid event type' }, { status: 400 });
  }

  const event: MarketingEvent = {
    createdAt: admin.firestore.Timestamp.now(),
    type: payload.type,
    pageUrl: typeof payload.pageUrl === 'string' ? payload.pageUrl : request.headers.get('referer') ?? undefined,
    referrer: typeof payload.referrer === 'string' ? payload.referrer : request.headers.get('referer') ?? undefined,
    serviceSlug: typeof payload.serviceSlug === 'string' ? payload.serviceSlug : undefined,
    metadata: typeof payload.metadata === 'object' ? payload.metadata : undefined,
  };

  await db.collection('marketingEvents').add(event);

  return NextResponse.json({ ok: true });
}
