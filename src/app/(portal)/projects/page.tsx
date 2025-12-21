'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { Project } from '@/types/data-models';
import Link from 'next/link';
import { FolderOpen, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function PortalProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId) return;

    // Only clients should access portal
    if (user.role !== 'client') {
      setError('Portal access is for client users only');
      setLoading(false);
      return;
    }

    const loadProjects = async () => {
      try {
        const db = getDb();
        const projectsRef = collection(db, `orgs/${user.orgId}/projects`);
        
        // Clients only see their own projects
        const q = query(
          projectsRef,
          where('clientId', '==', user.clientId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];

        setProjects(projectsData);
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Failed to load your projects');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'at-risk':
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'on-hold':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      default:
        return <FolderOpen className="h-5 w-5 text-blue-400" />;
    }
  };

  const getHealthBadge = (health: string) => {
    const colors = {
      green: 'bg-green-900 text-green-200',
      yellow: 'bg-yellow-900 text-yellow-200',
      red: 'bg-red-900 text-red-200',
    };
    return colors[health as keyof typeof colors] || colors.green;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-700 rounded w-1/4"></div>
        <div className="h-64 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4">
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Your Projects</h1>
        <p className="text-gray-400 mt-2">View and track your active projects</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <FolderOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400">
            Your projects will appear here once they are created.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(project.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">
                            {project.name}
                          </div>
                          {project.description && (
                            <div className="text-sm text-gray-400 truncate max-w-md">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900 text-blue-200 capitalize">
                        {project.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getHealthBadge(project.healthStatus)} capitalize`}>
                        {project.healthStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${project.progressPercentage}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-400">
                          {project.progressPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/portal/projects/${project.id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
