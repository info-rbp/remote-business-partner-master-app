'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { Project } from '@/types/data-models';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, User } from 'lucide-react';

interface MilestoneDoc {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: any;
  order: number;
  ownerId?: string;
}

export default function ProjectMilestonesPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<MilestoneDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId || !projectId) return;

    const loadData = async () => {
      try {
        const db = getDb();

        // Load project
        const projectRef = doc(db, `orgs/${user.orgId}/projects`, projectId);
        const projectDoc = await getDoc(projectRef);

        if (!projectDoc.exists()) {
          setError('Project not found');
          return;
        }

        const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;

        // Check access
        if (user.role === 'client' && projectData.clientId !== user.clientId) {
          setError('Access denied');
          return;
        }

        setProject(projectData);

        // Load milestones
        const milestonesRef = collection(db, `orgs/${user.orgId}/projects/${projectId}/milestones`);
        const milestonesQuery = query(milestonesRef, orderBy('order', 'asc'));
        const milestonesSnapshot = await getDocs(milestonesQuery);
        const milestonesData = milestonesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as MilestoneDoc[];

        setMilestones(milestonesData);
      } catch (err) {
        console.error('Error loading milestones:', err);
        setError('Failed to load milestones');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, projectId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
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

  const canCreateMilestone = user && (user.role === 'admin' || user.role === 'staff');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Milestones</h1>
            <p className="text-gray-600 mt-2">{project.name}</p>
          </div>
          {canCreateMilestone && (
            <Link
              href={`/projects/${projectId}/milestones/new`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Milestone
            </Link>
          )}
        </div>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No milestones yet</h3>
          <p className="text-gray-600 mb-6">
            Create milestones to track project progress and deliverables.
          </p>
          {canCreateMilestone && (
            <Link
              href={`/projects/${projectId}/milestones/new`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create First Milestone
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                      {milestone.order || index + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {milestone.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(milestone.status)} capitalize`}>
                      {milestone.status.replace('_', ' ').replace('-', ' ')}
                    </span>
                  </div>

                  {milestone.description && (
                    <p className="text-gray-600 mb-4 ml-11">{milestone.description}</p>
                  )}

                  <div className="flex items-center space-x-6 ml-11 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Due: {formatDate(milestone.dueDate)}</span>
                    </div>
                    {milestone.ownerId && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        <span>Owner: {milestone.ownerId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
