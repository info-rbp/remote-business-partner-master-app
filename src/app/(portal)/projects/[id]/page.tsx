'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { Project } from '@/types/data-models';
import Link from 'next/link';
import { ArrowLeft, Calendar, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

interface MilestoneDoc {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: any;
  order: number;
}

export default function PortalProjectDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<MilestoneDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId || !projectId) return;

    // Only clients should access portal
    if (user.role !== 'client') {
      setError('Portal access is for client users only');
      setLoading(false);
      return;
    }

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

        // Check access - client must own this project
        if (projectData.clientId !== user.clientId) {
          setError('You do not have access to this project');
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
        console.error('Error loading project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [user, projectId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-700 rounded w-1/4"></div>
        <div className="h-64 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4">
        <p className="text-red-200">{error || 'Project not found'}</p>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/portal/projects" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
        {project.description && (
          <p className="text-gray-400 mt-2">{project.description}</p>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Status</h3>
          </div>
          <p className="text-2xl font-bold text-white capitalize">
            {project.status.replace('-', ' ')}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Health</h3>
            <TrendingUp className="h-5 w-5 text-gray-600" />
          </div>
          <p className={`text-2xl font-bold capitalize ${
            project.healthStatus === 'green' ? 'text-green-400' :
            project.healthStatus === 'yellow' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {project.healthStatus}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Progress</h3>
            <CheckCircle className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-white">
            {project.progressPercentage}%
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Budget</h3>
            <DollarSign className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-white">
            {project.budget ? `${project.currency || 'AUD'} ${project.budget.toLocaleString()}` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Project Timeline</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-400">Start Date</dt>
              <dd className="text-sm text-white">{formatDate(project.startDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-400">End Date</dt>
              <dd className="text-sm text-white">{formatDate(project.endDate)}</dd>
            </div>
            {project.actualStartDate && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-400">Actual Start</dt>
                <dd className="text-sm text-white">{formatDate(project.actualStartDate)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Team Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-400 mb-1">Project Manager</dt>
              <dd className="text-sm text-white">{project.projectManager}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-400 mb-1">Team Size</dt>
              <dd className="text-sm text-white">
                {project.teamMembers.length} team member(s)
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Project Milestones</h2>

        {milestones.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No milestones defined yet</p>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                <div className="flex-1 flex items-start">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-900 text-blue-200 font-semibold text-sm flex-shrink-0">
                    {milestone.order || index + 1}
                  </span>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-white">{milestone.title}</h3>
                    {milestone.description && (
                      <p className="text-sm text-gray-400 mt-1">{milestone.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="text-sm text-white">{formatDate(milestone.dueDate)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    milestone.status === 'completed' ? 'bg-green-900 text-green-200' :
                    milestone.status === 'in-progress' ? 'bg-blue-900 text-blue-200' :
                    milestone.status === 'blocked' ? 'bg-red-900 text-red-200' :
                    'bg-gray-700 text-gray-300'
                  } capitalize`}>
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
