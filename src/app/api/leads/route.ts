import { NextResponse } from 'next/server';
import { createLead } from '@/lib/crm/repo';
import { createActivityForLeadTriage } from '@/lib/crm/workflows';

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
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : undefined;
  const companyName = typeof payload.companyName === 'string' ? payload.companyName.trim() : undefined;
  const message = typeof payload.message === 'string' ? payload.message.trim() : undefined;
  const serviceInterest = Array.isArray(payload.serviceInterest)
    ? payload.serviceInterest
    : payload.serviceInterest
      ? [payload.serviceInterest]
      : [];
  const urgency = typeof payload.urgency === 'number' && payload.urgency >= 1 && payload.urgency <= 5
    ? (payload.urgency as 1 | 2 | 3 | 4 | 5)
    : 3;
  const source = ['website', 'contact', 'referral', 'other'].includes(payload.source)
    ? payload.source
    : 'website';

  if (!name || !email) {
    return NextResponse.json({ ok: false, error: 'Name and email are required.' }, { status: 400 });
  }

  const notesParts = [message];
  const pageUrl = typeof payload.pageUrl === 'string' ? payload.pageUrl : request.headers.get('referer') ?? undefined;
  const referrer = typeof payload.referrer === 'string' ? payload.referrer : request.headers.get('referer') ?? undefined;
  if (pageUrl) notesParts.push(`Page: ${pageUrl}`);
  if (referrer) notesParts.push(`Referrer: ${referrer}`);

  const lead = await createLead({
    source,
    serviceInterest,
    urgency,
    fitScore: undefined,
    status: 'new',
    name,
    email,
    phone,
    companyName,
    notes: notesParts.filter(Boolean).join('\n'),
  });

  await createActivityForLeadTriage(lead.id);

  return NextResponse.json({ ok: true, leadId: lead.id });
}
