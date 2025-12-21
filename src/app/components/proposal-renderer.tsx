"use client";

import React from 'react';

type Deliverable = { name: string; description: string; acceptanceCriteria?: string[] };

export type ProposalRendererProps = {
  title: string;
  executiveSummary?: string;
  diagnosis?: string;
  scope?: string;
  methodology?: string;
  deliverables?: Deliverable[];
  timeline?: { estimatedDuration?: number; milestones?: Array<{ name: string; description: string; dueOffset?: number; dueDate?: any }> };
  pricing?: { currency?: string; totalAmount?: number; lineItems?: Array<{ name: string; amount: number; notes?: string }> };
  assumptions?: string[];
  exclusions?: string[];
  acceptanceCriteria?: string[];
  nextSteps?: string[];
  terms?: string;
  content?: string; // legacy simple content
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    footerText?: string;
  };
  // Internal overlays (staff-only)
  overlays?: {
    showConfidence?: boolean;
    confidenceBySection?: Record<string, number>; // 0-100
    riskFlags?: Array<{ title: string; severity: 'low' | 'medium' | 'high' | 'critical'; description: string }>;
    marginWarning?: string | null;
    notes?: string[];
  };
};

export function ProposalRenderer(props: ProposalRendererProps) {
  const { branding, overlays } = props;
  const primary = branding?.primaryColor || '#1f2937';
  const accent = branding?.secondaryColor || '#6366f1';

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-md print:shadow-none">
      <div className="p-6 border-b" style={{ borderColor: '#eee' }}>
        <div className="flex items-center gap-4">
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt="Logo" className="h-10 w-auto" />
          )}
          <h1 className="text-3xl font-bold" style={{ color: primary }}>{props.title}</h1>
        </div>
      </div>

      {/* Internal overlays */}
      {overlays && (
        <div className="p-4 bg-yellow-50 text-yellow-800 text-sm border-b border-yellow-200 print:hidden">
          <div className="font-semibold mb-1">Internal Review Overlays</div>
          {overlays.marginWarning && <div>Margin warning: {overlays.marginWarning}</div>}
          {overlays.riskFlags && overlays.riskFlags.length > 0 && (
            <div className="mt-1">
              <div className="font-semibold">AI Risk Flags</div>
              <ul className="list-disc ml-5">
                {overlays.riskFlags.map((r, i) => (
                  <li key={i}><span className="uppercase">{r.severity}</span>: {r.title} — {r.description}</li>
                ))}
              </ul>
            </div>
          )}
          {overlays.notes && overlays.notes.length > 0 && (
            <div className="mt-1">
              <div className="font-semibold">Notes</div>
              <ul className="list-disc ml-5">
                {overlays.notes.map((n, i) => (<li key={i}>{n}</li>))}
              </ul>
            </div>
          )}
        </div>
      )}

      <section className="p-6">
        {props.content && (
          <article className="prose max-w-none">
            {props.content}
          </article>
        )}

        {props.executiveSummary && (
          <Section title="Executive Summary" accent={accent}>
            <p>{props.executiveSummary}</p>
          </Section>
        )}

        {props.scope && (
          <Section title="Scope & Deliverables" accent={accent}>
            <p>{props.scope}</p>
            {props.deliverables && props.deliverables.length > 0 && (
              <ul className="list-disc ml-6">
                {props.deliverables.map((d, i) => (
                  <li key={i}>
                    <div className="font-semibold">{d.name}</div>
                    <div>{d.description}</div>
                    {d.acceptanceCriteria && d.acceptanceCriteria.length > 0 && (
                      <ul className="list-disc ml-6 text-sm text-gray-600">
                        {d.acceptanceCriteria.map((c, j) => <li key={j}>{c}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {props.methodology && (
          <Section title="Methodology" accent={accent}><p>{props.methodology}</p></Section>
        )}

        {props.timeline && props.timeline.milestones && (
          <Section title="Milestones & Timeline" accent={accent}>
            <ul className="list-disc ml-6">
              {props.timeline.milestones.map((m, i) => (
                <li key={i}>
                  <div className="font-semibold">{m.name}</div>
                  <div>{m.description}</div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {props.pricing && (
          <Section title="Pricing & Payment" accent={accent}>
            {props.pricing.totalAmount != null && (
              <div className="text-xl font-semibold mb-2">Total: {props.pricing.currency || 'AUD'} {props.pricing.totalAmount}</div>
            )}
            {props.pricing.lineItems && props.pricing.lineItems.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Item</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {props.pricing.lineItems.map((li, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{li.name}</td>
                      <td className="py-2">{li.amount}</td>
                      <td className="py-2 text-gray-500">{li.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}

        {props.assumptions && props.assumptions.length > 0 && (
          <ClarityBlock title="Assumptions" items={props.assumptions} />
        )}
        {props.exclusions && props.exclusions.length > 0 && (
          <ClarityBlock title="What’s Not Included" items={props.exclusions} />
        )}
        {props.acceptanceCriteria && props.acceptanceCriteria.length > 0 && (
          <ClarityBlock title="Acceptance Criteria" items={props.acceptanceCriteria} />
        )}
        {props.nextSteps && props.nextSteps.length > 0 && (
          <ClarityBlock title="Next Steps" items={props.nextSteps} />
        )}

        {props.terms && (
          <Section title="Terms" accent={accent}><p className="text-sm text-gray-600">{props.terms}</p></Section>
        )}
      </section>

      {branding?.footerText && (
        <footer className="px-6 py-4 text-xs text-gray-500 border-t print:fixed print:bottom-0 print:left-0 print:right-0 bg-white">
          {branding.footerText}
        </footer>
      )}
    </div>
  );
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-2" style={{ color: accent }}>{title}</h2>
      <div className="prose max-w-none">{children}</div>
    </section>
  );
}

function ClarityBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-6 p-4 bg-gray-50 border rounded">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="list-disc ml-6">
        {items.map((i, idx) => (<li key={idx}>{i}</li>))}
      </ul>
    </div>
  );
}
