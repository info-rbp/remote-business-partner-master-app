'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { Project, ProjectMilestone } from '@/types/data-models';
import Link from 'next/link';
import { ArrowLeft, Calendar, DollarSign, Users, TrendingUp, CheckCircle } from 'lucide-react';

interface MilestoneDoc {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: any;
  order: number;
}

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

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

        // Check access for clients
        if (user.role === 'client' && projectData.clientId !== user.clientId) {
          setError('Access denied');
          return;
        }

        setProject(projectData);

        // Load milestones from subcollection
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        {project.description && (
          <p className="text-gray-600 mt-2">{project.description}</p>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 capitalize">
            {project.status.replace('-', ' ')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Health</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className={`text-2xl font-bold capitalize ${
            project.healthStatus === 'green' ? 'text-green-600' :
            project.healthStatus === 'yellow' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {project.healthStatus}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Progress</h3>
            <CheckCircle className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {project.progressPercentage}%
          </p>
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

      {/* Project Details */}
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
              <dd className="text-sm text-gray-900">
                {project.teamMembers.length} member(s)
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-1">Client Users</dt>
              <dd className="text-sm text-gray-900">
                {project.clientUsers.length} user(s)
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Milestones</h2>
          <Link
            href={`/projects/${projectId}/milestones`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
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
                  {milestone.description && (
                    <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="text-sm text-gray-900">{formatDate(milestone.dueDate)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                    milestone.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    milestone.status === 'blocked' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
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
