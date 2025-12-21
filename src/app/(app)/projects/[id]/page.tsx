'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDb } from '@/lib/firebase-client';
import { useAuth, useRole } from '@/lib/auth-context';
import { useToast } from '@/app/components/toast';
import type {
  ClientRequest6,
  DeliveryProject,
  DeliveryProjectStatus,
  Project,
  ProjectDeliverable6,
  ProjectMilestone6,
  ProjectUpdate6,
} from '@/types/data-models';
import type { ClientIntelligenceSnapshot } from '@/types/phase13-models';
import {
  ArrowLeft,
  CheckCircle,
  DollarSign,
  Users,
  TrendingUp,
} from 'lucide-react';

type Params = { params: { id: string } };

type MilestoneDoc = {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: any;
  order: number;
};

type AppUser = {
  orgId?: string;
  role?: string;
  clientId?: string;
  uid?: string;
};

export default function ProjectDetailPage({ params }: Params) {
  const { user } = useAuth();
  const { isStaff } = useRole();
  const projectId = params.id;

  if (!user) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return isStaff ? (
    <StaffProjectOverview projectId={projectId} user={user} />
  ) : (
    <MemberProjectDetail projectId={projectId} user={user} />
  );
}

function StaffProjectOverview({ projectId, user }: { projectId: string; user: AppUser }) {
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
    if (!user?.orgId) return;
    const db = getDb();

    getDoc(doc(db, `orgs/${user.orgId}/projects`, projectId)).then((snap) => {
      const data = snap.data();
      if (data) {
        const p: DeliveryProject = {
          id: snap.id,
          orgId: user.orgId!,
          proposalId: (data as any).sourceProposalId || data.proposalId,
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

    const msRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/milestones`);
    const msQuery = query(msRef, orderBy('order'));
    const unsubMs = onSnapshot(msQuery, (snap) => {
      setMilestones(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectMilestone6, 'id'>) })));
    });

    const dRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/deliverables`);
    const unsubD = onSnapshot(dRef, (snap) => {
      setDeliverables(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectDeliverable6, 'id'>) })));
    });

    const rRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/requests`);
    const rQuery = query(rRef);
    const unsubR = onSnapshot(rQuery, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientRequest6, 'id'>) })));
    });

    const uRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/updates`);
    const uQuery = query(uRef, orderBy('periodEnd', 'desc'));
    const unsubU = onSnapshot(uQuery, (snap) => {
      setUpdates(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectUpdate6, 'id'>) })));
    });

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
  }, [user?.orgId, projectId, user?.uid]);

  const milestoneSummary = useMemo(() => {
    const summary = { not_started: 0, in_progress: 0, blocked: 0, complete: 0 } as Record<ProjectMilestone6['status'], number>;
    milestones.forEach((m) => { summary[m.status] = (summary[m.status] || 0) + 1; });
    return summary;
  }, [milestones]);

  const deliverablesNeedingReview = useMemo(
    () => deliverables.filter((d) => d.status === 'in_review' || d.status === 'changes_requested'),
    [deliverables]
  );

  const openClientRequests = useMemo(
    () => requests.filter((r) => r.status === 'open' || r.status === 'in_progress'),
    [requests]
  );

  const riskFlags = useMemo(() => {
    const now = Date.now();
    const milestoneOverdue = milestones.some((m) => m.dueDate && m.status !== 'complete' && m.dueDate.toMillis && m.dueDate.toMillis() < now);
    const deliverableStuck = deliverables.some((d) => d.status === 'changes_requested');
    const latestUpdate = updates[0];
    const updateLag = latestUpdate ? (latestUpdate.published && latestUpdate.periodEnd?.toMillis?.() < now - 7 * 86400000) : true;
    return { milestoneOverdue, deliverableStuck, updateLag };
  }, [milestones, deliverables, updates]);

  if (!project) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.id} – Project Overview</h1>
          <p className="text-gray-400 text-sm">Client: {project.clientId} · Proposal: {project.proposalId}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded bg-indigo-700 text-white">Status: {project.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(['not_started', 'in_progress', 'blocked', 'complete'] as const).map((k) => (
          <div key={k} className="bg-gray-800 p-4 rounded">
            <p className="text-gray-400 text-sm">{k.replace('_', ' ')}</p>
            <p className="text-3xl font-bold text-white">{milestoneSummary[k] || 0}</p>
          </div>
        ))}
      </div>

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
                const res = await generate({ orgId: user.orgId, projectId });
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
          >
            {genLoading ? 'Generating…' : 'Generate Snapshot'}
          </button>
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
                        updatedAt: (await import('firebase/firestore')).serverTimestamp?.() ?? (s as any).updatedAt,
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

function MemberProjectDetail({ projectId, user }: { projectId: string; user: AppUser }) {
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<MilestoneDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId || !projectId) return;

    const loadProject = async () => {
      try {
        const db = getDb();
        const projectRef = doc(db, `orgs/${user.orgId}/projects`, projectId);
        const projectDoc = await getDoc(projectRef);

        if (!projectDoc.exists()) {
          setError('Project not found');
          return;
        }

        const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;

        if (user.role === 'client' && projectData.clientId !== user.clientId) {
          setError('Access denied');
          return;
        }

        setProject(projectData);

        const milestonesRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/milestones`);
        const milestonesQuery = query(milestonesRef, orderBy('order', 'asc'));
        const milestonesSnapshot = await getDocs(milestonesQuery);
        const milestonesData = milestonesSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MilestoneDoc[];

        setMilestones(milestonesData);
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [user?.orgId, user?.role, user?.clientId, projectId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        {project.description && <p className="text-gray-600 mt-2">{project.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 capitalize">{project.status.replace('-', ' ')}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Health</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p
            className={`text-2xl font-bold capitalize ${
              project.healthStatus === 'green'
                ? 'text-green-600'
                : project.healthStatus === 'yellow'
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {project.healthStatus}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Progress</h3>
            <CheckCircle className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{project.progressPercentage}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Budget</h3>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {project.budget ? `${project.currency || 'AUD'} ${project.budget.toLocaleString()}` : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="text-sm text-gray-900">{project.companyName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="text-sm text-gray-900">{formatDate(project.startDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="text-sm text-gray-900">{formatDate(project.endDate)}</dd>
            </div>
            {project.actualStartDate && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Actual Start</dt>
                <dd className="text-sm text-gray-900">{formatDate(project.actualStartDate)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-1">Project Manager</dt>
              <dd className="text-sm text-gray-900">{project.projectManager}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-1">Team Members</dt>
              <dd className="text-sm text-gray-900">{project.teamMembers.length} member(s)</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-1">Client Users</dt>
              <dd className="text-sm text-gray-900">{project.clientUsers.length} user(s)</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Milestones</h2>
          <Link href={`/projects/${projectId}/milestones`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All →
          </Link>
        </div>

        {milestones.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No milestones yet</p>
        ) : (
          <div className="space-y-4">
            {milestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{milestone.title}</h3>
                  {milestone.description && <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="text-sm text-gray-900">{formatDate(milestone.dueDate)}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      milestone.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : milestone.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800'
                          : milestone.status === 'blocked'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                    } capitalize`}
                  >
                    {milestone.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
