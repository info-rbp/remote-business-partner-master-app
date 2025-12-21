"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getDb } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { where, limit } from 'firebase/firestore';
import type { ClientIntelligenceSnapshot } from '@/types/phase13-models';
import type { DeliveryProject, DeliveryProjectStatus, ProjectMilestone6, ProjectDeliverable6, ClientRequest6, ProjectUpdate6 } from '@/types/data-models';

type Params = { params: { id: string } };

export default function ClientProjectDashboard({ params }: Params) {
  const { user } = useAuth();
  const projectId = params.id;

  const [project, setProject] = useState<DeliveryProject | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone6[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable6[]>([]);
  const [requests, setRequests] = useState<ClientRequest6[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate6[]>([]);
  const [clientIntel, setClientIntel] = useState<ClientIntelligenceSnapshot | null>(null);

  useEffect(() => {
    if (!user?.orgId || !user?.clientId) return;
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
          ownerId: data.projectManager,
          riskLevel: data.riskLevel,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        setProject(p);
      }
    });

    const msRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/milestones`);
    const unsubMs = onSnapshot(query(msRef, orderBy('order')), (snap) => {
      setMilestones(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectMilestone6, 'id'>) })));
    });

    const dRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/deliverables`);
    const unsubD = onSnapshot(dRef, (snap) => {
      setDeliverables(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectDeliverable6, 'id'>) })));
    });

    const rRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/requests`);
    const unsubR = onSnapshot(rRef, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientRequest6, 'id'>) })));
    });

    const uRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/updates`);
    const unsubU = onSnapshot(query(uRef, orderBy('periodEnd', 'desc')), (snap) => {
      setUpdates(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectUpdate6, 'id'>) })));
    });

    // Latest published client intelligence snapshot
    const ciRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/clientIntelligence`);
    const unsubCI = onSnapshot(query(ciRef, where('published', '==', true), orderBy('generatedAt', 'desc'), limit(1)), (snap) => {
      const docu = snap.docs[0];
      setClientIntel(docu ? ({ id: docu.id, ...(docu.data() as any) }) : null);
    });

    return () => { unsubMs(); unsubD(); unsubR(); unsubU(); unsubCI(); };
  }, [user?.orgId, user?.clientId, projectId]);

  const currentMilestone = useMemo(() => milestones.find((m) => m.status !== 'complete'), [milestones]);
  const nextMilestone = useMemo(() => {
    const idx = milestones.findIndex((m) => m.id === currentMilestone?.id);
    return idx >= 0 ? milestones[idx + 1] : undefined;
  }, [milestones, currentMilestone]);
  const latestUpdate = useMemo(() => updates.find((u) => u.published), [updates]);

  const awaitingClientDeliverables = useMemo(() => deliverables.filter((d) => d.requiresClientApproval && (d.status === 'submitted' || d.status === 'in_review')), [deliverables]);

  const approveDeliverable = async (deliverableId: string) => {
    if (!user?.orgId) return;
    const db = getDb();
    await updateDoc(doc(db, `orgs/${user.orgId}/projects/${projectId}/deliverables/${deliverableId}`), {
      status: 'approved',
      approvedAt: new Date(),
    } as any);
  };

  const requestChanges = async (deliverableId: string, comment: string) => {
    if (!user?.orgId) return;
    const db = getDb();
    await updateDoc(doc(db, `orgs/${user.orgId}/projects/${projectId}/deliverables/${deliverableId}`), {
      status: 'changes_requested',
      // store comment on a separate request object rather than deliverable
    } as any);
    // Optionally open a client request linked to deliverable
  };

  if (!project) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Dashboard</h1>
          <p className="text-gray-400 text-sm">Status: {project.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="font-semibold">Current milestone</h2>
          {currentMilestone ? (
            <div>
              <p className="text-white">{currentMilestone.title}</p>
              <p className="text-gray-400 text-sm">Due {currentMilestone.dueDate ? currentMilestone.dueDate.toDate().toLocaleDateString() : 'TBD'}</p>
            </div>
          ) : <p className="text-gray-400">All milestones complete</p>}
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="font-semibold">Next milestone</h2>
          {nextMilestone ? (
            <div>
              <p className="text-white">{nextMilestone.title}</p>
              <p className="text-gray-400 text-sm">Due {nextMilestone.dueDate ? nextMilestone.dueDate.toDate().toLocaleDateString() : 'TBD'}</p>
            </div>
          ) : <p className="text-gray-400">None</p>}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h2 className="font-semibold">Latest update</h2>
        {latestUpdate ? (
          <div className="space-y-1 text-sm">
            <p className="text-white">{latestUpdate.summary}</p>
            {latestUpdate.nextSteps && <p className="text-gray-300">What’s next: {latestUpdate.nextSteps}</p>}
            {latestUpdate.decisionsNeeded && <p className="text-gray-300">Decisions needed: {latestUpdate.decisionsNeeded}</p>}
          </div>
        ) : <p className="text-gray-400">No updates published yet</p>}
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h2 className="font-semibold">Intelligence Snapshot</h2>
        {!clientIntel ? (
          <p className="text-gray-400">No published snapshot yet</p>
        ) : (
          <div className="space-y-3">
            <div>
              <h3 className="text-white font-semibold">Current State</h3>
              <p className="text-gray-300 text-sm">{clientIntel.currentStateSummary}</p>
            </div>
            {clientIntel.decisionsRequired?.length > 0 && (
              <div>
                <h3 className="text-white font-semibold">Decisions Required</h3>
                <ul className="space-y-2">
                  {clientIntel.decisionsRequired.map((d) => (
                    <li key={d.decisionId} className="flex justify-between">
                      <span className="text-gray-200 text-sm">{d.title}</span>
                      <span className="text-gray-500 text-xs">{d.dueBy ? d.dueBy.toDate().toLocaleDateString() : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {clientIntel.inputsRequired?.length > 0 && (
              <div>
                <h3 className="text-white font-semibold">Inputs Required</h3>
                <ul className="space-y-2">
                  {clientIntel.inputsRequired.map((i) => (
                    <li key={i.inputId} className="flex justify-between">
                      <span className="text-gray-200 text-sm">{i.description}</span>
                      <span className="text-gray-500 text-xs">{i.dueBy ? i.dueBy.toDate().toLocaleDateString() : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {clientIntel.nextSteps?.length > 0 && (
              <div>
                <h3 className="text-white font-semibold">Next Steps</h3>
                <ul className="list-disc list-inside text-gray-300 text-sm">
                  {clientIntel.nextSteps.map((s, idx) => (<li key={idx}>{s}</li>))}
                </ul>
              </div>
            )}
            {clientIntel.recentProgressSummary && (
              <div>
                <h3 className="text-white font-semibold">Recent Progress</h3>
                <p className="text-gray-300 text-sm">{clientIntel.recentProgressSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h2 className="font-semibold">Deliverables awaiting your action</h2>
        {awaitingClientDeliverables.length === 0 ? (
          <p className="text-gray-400">None at the moment</p>
        ) : (
          <ul className="space-y-2">
            {awaitingClientDeliverables.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-white">{d.title}</p>
                  <p className="text-gray-400 text-xs">Version {d.version}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-green-600 rounded text-white" onClick={() => approveDeliverable(d.id)}>Approve</button>
                  <button className="px-3 py-1 bg-yellow-600 rounded text-white" onClick={() => requestChanges(d.id, 'Please adjust as discussed')}>Request changes</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h2 className="font-semibold">Your requests</h2>
        {requests.length === 0 ? <p className="text-gray-400">No active requests</p> : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span className="text-white">{r.type}: {r.description}</span>
                <span className="text-gray-400">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
