"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRole, useAuth } from '@/lib/auth-context';
import { getDb } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { ClientIntelligenceSnapshot } from '@/types/phase13-models';
import { useToast } from '@/app/components/toast';
import type { DeliveryProjectStatus, DeliveryProject, ProjectMilestone6, ProjectDeliverable6, ClientRequest6, ProjectUpdate6 } from '@/types/data-models';

type Params = { params: { id: string } };

export default function ProjectOverviewPage({ params }: Params) {
  const { isStaff } = useRole();
  const { user } = useAuth();
  const projectId = params.id;

  const [project, setProject] = useState<DeliveryProject | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone6[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable6[]>([]);
  const [requests, setRequests] = useState<ClientRequest6[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate6[]>([]);
  const [snapshots, setSnapshots] = useState<(ClientIntelligenceSnapshot & { id: string })[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);
  const { show } = useToast();

  useEffect(() => {
    if (!user?.orgId || !isStaff) return;
    const db = getDb();

    // Project doc
    getDoc(doc(db, `orgs/${user.orgId}/projects`, projectId)).then((snap) => {
      const data = snap.data();
      if (data) {
        const p: DeliveryProject = {
          id: snap.id,
          orgId: user.orgId!,
          proposalId: data.sourceProposalId || data.proposalId,
          clientId: data.clientId,
          status: (data.status as DeliveryProjectStatus) || 'onboarding',
          startDate: data.startDate,
          targetEndDate: data.endDate || data.targetEndDate,
          ownerId: data.projectManager || user.uid,
          riskLevel: data.riskLevel,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        setProject(p);
      }
    });

    // Milestones
    const msRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/milestones`);
    const msQuery = query(msRef, orderBy('order'));
    const unsubMs = onSnapshot(msQuery, (snap) => {
      setMilestones(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectMilestone6, 'id'>) })));
    });

    // Deliverables
    const dRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/deliverables`);
    const unsubD = onSnapshot(dRef, (snap) => {
      setDeliverables(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectDeliverable6, 'id'>) })));
    });

    // Requests
    const rRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/requests`);
    const rQuery = query(rRef);
    const unsubR = onSnapshot(rQuery, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientRequest6, 'id'>) })));
    });

    // Updates
    const uRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/updates`);
    const uQuery = query(uRef, orderBy('periodEnd', 'desc'));
    const unsubU = onSnapshot(uQuery, (snap) => {
      setUpdates(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectUpdate6, 'id'>) })));
    });

    // Client intelligence snapshots
    const ciRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/clientIntelligence`);
    const ciQuery = query(ciRef, orderBy('generatedAt', 'desc'), limit(5));
    const unsubCI = onSnapshot(ciQuery, (snap) => {
      setSnapshots(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
    });

    return () => {
      unsubMs();
      unsubD();
      unsubR();
      unsubU();
      unsubCI();
    };
  }, [user?.orgId, projectId, isStaff]);

  const milestoneSummary = useMemo(() => {
    const summary = { not_started: 0, in_progress: 0, blocked: 0, complete: 0 } as Record<ProjectMilestone6['status'], number>;
    milestones.forEach((m) => { summary[m.status] = (summary[m.status] || 0) + 1; });
    return summary;
  }, [milestones]);

  const deliverablesNeedingReview = useMemo(() => deliverables.filter((d) => d.status === 'in_review' || d.status === 'changes_requested'), [deliverables]);

  const openClientRequests = useMemo(() => requests.filter((r) => r.status === 'open' || r.status === 'in_progress'), [requests]);

  const riskFlags = useMemo(() => {
    const now = Date.now();
    const milestoneOverdue = milestones.some((m) => m.dueDate && m.status !== 'complete' && m.dueDate.toMillis() < now);
    const deliverableStuck = deliverables.some((d) => d.status === 'changes_requested');
    const latestUpdate = updates[0];
    const updateLag = latestUpdate ? (latestUpdate.published && latestUpdate.periodEnd.toMillis() < now - 7 * 86400000) : true;
    return { milestoneOverdue, deliverableStuck, updateLag };
  }, [milestones, deliverables, updates]);

  if (!isStaff) {
    return <div className="text-red-500">Access denied. Staff/admin only.</div>;
  }

  if (!project) {
    return <div className="text-gray-400">Loading project...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.id} – Project Overview</h1>
          <p className="text-gray-400 text-sm">Client: {project.clientId} · Proposal: {project.proposalId}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded bg-indigo-700 text-white">Status: {project.status}</span>
        </div>
      </div>

      {/* Milestones summary */}
      <div className="grid grid-cols-4 gap-4">
        {(['not_started','in_progress','blocked','complete'] as const).map((k) => (
          <div key={k} className="bg-gray-800 p-4 rounded">
            <p className="text-gray-400 text-sm">{k.replace('_',' ')}</p>
            <p className="text-3xl font-bold text-white">{milestoneSummary[k] || 0}</p>
          </div>
        ))}
      </div>

      {/* Deliverables requiring review */}
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Deliverables requiring review</h2>
        {deliverablesNeedingReview.length === 0 ? (
          <p className="text-gray-400">None</p>
        ) : (
          <ul className="space-y-2">
            {deliverablesNeedingReview.map((d) => (
              <li key={d.id} className="flex justify-between">
                <span className="text-white">{d.title}</span>
                <span className="text-gray-400">{d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Open client requests */}
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Open client requests</h2>
        {openClientRequests.length === 0 ? (
          <p className="text-gray-400">No open requests</p>
        ) : (
          <ul className="space-y-2">
            {openClientRequests.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span className="text-white">{r.type}: {r.description}</span>
                <span className="text-gray-400">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Risk indicators */}
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Risk indicators</h2>
        <ul className="space-y-1 text-sm">
          <li className={riskFlags.milestoneOverdue ? 'text-yellow-400' : 'text-green-500'}>
            Milestone overdue: {riskFlags.milestoneOverdue ? 'Yes' : 'No'}
          </li>
          <li className={riskFlags.deliverableStuck ? 'text-yellow-400' : 'text-green-500'}>
            Deliverable stuck: {riskFlags.deliverableStuck ? 'Yes' : 'No'}
          </li>
          <li className={riskFlags.updateLag ? 'text-yellow-400' : 'text-green-500'}>
            Weekly update behind: {riskFlags.updateLag ? 'Yes' : 'No'}
          </li>
        </ul>
      </div>

      {/* Client Intelligence Controls */}
      <div className="bg-gray-800 p-4 rounded space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Client Intelligence</h2>
          <button
            className="px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
            disabled={genLoading}
            onClick={async () => {
              setGenLoading(true);
              setGenError(null);
              setGenSuccess(null);
              try {
                const functions = getFunctions();
                const generate = httpsCallable(functions, 'generateClientIntelligence');
                const res = await generate({ orgId: user!.orgId, projectId });
                if ((res.data as any)?.snapshotId) {
                  setGenSuccess('Snapshot generated');
                } else {
                  setGenSuccess('Requested snapshot generation');
                }
              } catch (e: any) {
                setGenError(e?.message || 'Failed to generate snapshot');
              } finally {
                setGenLoading(false);
              }
            }}
          >{genLoading ? 'Generating…' : 'Generate Snapshot'}</button>
        </div>

        {genError && <p className="text-sm text-red-400">{genError}</p>}
        {genSuccess && <p className="text-sm text-green-400">{genSuccess}</p>}

        {snapshots.length === 0 ? (
          <p className="text-gray-400">No snapshots yet</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{s.currentStateSummary}</p>
                  <p className="text-gray-500 text-xs">Generated {s.generatedAt?.toDate?.() ? s.generatedAt.toDate().toLocaleString() : ''}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300">Published</span>
                  <input
                    type="checkbox"
                    checked={!!s.published}
                    onChange={async (e) => {
                      const db = getDb();
                      await updateDoc(doc(db, `orgs/${user!.orgId}/projects/${projectId}/clientIntelligence/${s.id}`), {
                        published: e.target.checked,
                        updatedAt: (await import('firebase/firestore')).serverTimestamp?.() ?? s.updatedAt,
                      } as any);
                      show(e.target.checked ? 'Snapshot published' : 'Snapshot unpublished', 'success');
                    }}
                    className="w-4 h-4"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
