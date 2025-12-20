import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Timestamp } from 'firebase-admin/firestore';
import type { Lead } from '@/lib/marketing/types';

function getRequestMeta(request: Request) {
  const url = request.headers.get('x-forwarded-host')
    ? `${request.headers.get('x-forwarded-proto') ?? 'https'}://${request.headers.get('x-forwarded-host')}${new URL(request.url).pathname}`
    : request.headers.get('referer') ?? undefined;

  return {
    pageUrl: request.headers.get('x-page-url') ?? url,
    referrer: request.headers.get('referer') ?? undefined,
  };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  if (payload.website) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const source = payload.source === 'public_service_inquiry' ? 'public_service_inquiry' : 'public_contact';

  if (!name || !email) {
    return NextResponse.json({ ok: false, error: 'Name and email are required.' }, { status: 400 });
  }

  const { pageUrl, referrer } = getRequestMeta(request);
  const now = Timestamp.now();

  const lead: Lead = {
    createdAt: now,
    source,
    name,
    email,
    company: typeof payload.company === 'string' ? payload.company.trim() : undefined,
    phone: typeof payload.phone === 'string' ? payload.phone.trim() : undefined,
    message,
    serviceInterests: Array.isArray(payload.serviceInterests) ? payload.serviceInterests : undefined,
    urgencyScore: typeof payload.urgencyScore === 'number' ? payload.urgencyScore : undefined,
    pageUrl: typeof payload.pageUrl === 'string' ? payload.pageUrl : pageUrl,
    referrer: typeof payload.referrer === 'string' ? payload.referrer : referrer,
    crm: {
      status: 'new',
    },
  };

  const docRef = await db.collection('leads').add(lead);

  return NextResponse.json({ ok: true, leadId: docRef.id });
}
