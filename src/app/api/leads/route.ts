import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';
import { Lead } from '@/types/data-models';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || 'default-org';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.firstName || !data.lastName || !data.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const leadData: Partial<Lead> = {
      orgId: DEFAULT_ORG_ID,
      source: data.source || 'website',
      sourceDetail: data.sourceDetail || 'contact-form',
      serviceInterest: data.serviceInterest || [],
      urgency: data.urgency || 'medium',
      fitScore: data.fitScore || 50,
      status: 'new',
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      message: data.message,
      budget: data.budget,
      timeline: data.timeline,
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any,
    };

    const leadRef = await admin.db
      .collection(`orgs/${DEFAULT_ORG_ID}/leads`)
      .add(leadData);

    await admin.db
      .collection(`orgs/${DEFAULT_ORG_ID}/activities`)
      .add({
        orgId: DEFAULT_ORG_ID,
        type: 'task',
        subject: `Follow up with ${data.firstName} ${data.lastName}`,
        description: 'New lead from website contact form',
        status: 'pending',
        priority: data.urgency === 'urgent' ? 'high' : 'medium',
        dueDate: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        linkedEntityType: 'lead',
        linkedEntityId: leadRef.id,
        linkedEntityName: `${data.firstName} ${data.lastName}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true, leadId: leadRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
}
