'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { useAuth } from '@/lib/auth-context';
import { Project, ProjectDeliverable, Decision, ClientRequest } from '@/types/data-models';

export default function ClientPortalPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<(Project & { id: string })[]>([]);
  const [decisionsNeeded, setDecisionsNeeded] = useState<(Decision & { id: string })[]>([]);
  const [openRequests, setOpenRequests] = useState<(ClientRequest & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.orgId || !user?.clientId) {
      setLoading(false);
      return;
    }

    const db = getDb();

    // Subscribe to projects
    const projectsRef = collection(db, `orgs/${user.orgId}/projects`);
    const projectsQuery = query(
      projectsRef,
      where('clientUsers', 'array-contains', user.uid),
      where('status', 'in', ['onboarding', 'in-progress', 'at-risk'])
    );

    const unsubProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (Project & { id: string })[];
      
      setProjects(projectsData);
      setLoading(false);
    });

    // Subscribe to decisions
    const decisionsRef = collection(db, `orgs/${user.orgId}/decisions`);
    const decisionsQuery = query(
      decisionsRef,
      orderBy('decidedAt', 'desc')
    );

    const unsubDecisions = onSnapshot(decisionsQuery, (snapshot) => {
      const decisionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (Decision & { id: string })[];
      
      // Filter decisions for user's projects
      const projectIds = projects.map((p: Project & { id: string }) => p.id);
      const relevantDecisions = decisionsData.filter(d => 
        d.projectId && projectIds.includes(d.projectId)
      );
      
      setDecisionsNeeded(relevantDecisions.slice(0, 5));
    });

    // Subscribe to client requests
    const requestsRef = collection(db, `orgs/${user.orgId}/clientRequests`);
    const requestsQuery = query(
      requestsRef,
      where('clientId', '==', user.clientId),
      where('status', 'in', ['open', 'assigned', 'in-progress']),
      orderBy('createdAt', 'desc')
    );

    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (ClientRequest & { id: string })[];
      
      setOpenRequests(requestsData);
    });

    return () => {
      unsubProjects();
      unsubDecisions();
      unsubRequests();
    };
  }, [user?.orgId, user?.clientId, user?.uid]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      onboarding: 'bg-blue-600',
      'in-progress': 'bg-green-600',
      'at-risk': 'bg-red-600',
      'on-hold': 'bg-yellow-600',
      completed: 'bg-purple-600',
    };
    return colors[status] || 'bg-gray-600';
  };

  const getHealthColor = (health: string) => {
    const colors: Record<string, string> = {
      green: 'text-green-400',
      yellow: 'text-yellow-400',
      red: 'text-red-400',
    };
    return colors[health] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <p className="text-gray-400">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user?.clientId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You don't have client portal access yet.</p>
          <p className="text-gray-500 text-sm">Please contact your account manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-gray-400">Here's an overview of your active projects</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Active Projects</p>
            <p className="text-3xl font-bold text-white">{projects.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Pending Decisions</p>
            <p className="text-3xl font-bold text-yellow-400">{decisionsNeeded.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Open Requests</p>
            <p className="text-3xl font-bold text-blue-400">{openRequests.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Avg Health</p>
            <p className="text-3xl font-bold text-green-400">
              {projects.filter(p => p.healthStatus === 'green').length}/{projects.length}
            </p>
          </div>
        </div>

        {/* Active Projects */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Active Projects</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/portal/projects/${project.id}`}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors block"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">{project.name}</h3>
                  <span className={`px-3 py-1 rounded text-white text-sm ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                
                <p className="text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-500 text-sm">Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 rounded-full h-2"
                          style={{ width: `${project.progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-white text-sm font-medium">{project.progressPercentage}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Health</p>
                    <p className={`font-bold text-lg ${getHealthColor(project.healthStatus)}`}>
                      {project.healthStatus.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {project.deliverables.filter(d => d.status === 'completed').length}/{project.deliverables.length} deliverables
                  </span>
                  <span className="text-blue-400 hover:text-blue-300">
                    View Details →
                  </span>
                </div>
              </Link>
            ))}

            {projects.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <p>No active projects yet.</p>
                <p className="text-sm mt-2">Projects will appear here once they're created by your account manager.</p>
              </div>
            )}
          </div>
        </div>

        {/* Decisions Needed */}
        {decisionsNeeded.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Recent Decisions</h2>
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              {decisionsNeeded.map((decision) => (
                <div key={decision.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{decision.title}</h3>
                      <p className="text-gray-400 mb-2">{decision.description}</p>
                      <p className="text-gray-500 text-sm">
                        Decision: <span className="text-white">{decision.decision}</span>
                      </p>
                      <p className="text-gray-500 text-sm">
                        Rationale: {decision.rationale}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded text-white text-sm ${
                      decision.impact === 'high' ? 'bg-red-600' :
                      decision.impact === 'medium' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}>
                      {decision.impact} impact
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Requests */}
        {openRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Your Requests</h2>
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              {openRequests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{request.subject}</h3>
                      <p className="text-gray-400 mb-2">{request.description}</p>
                      <div className="flex gap-4 text-sm">
                        <span className={`px-2 py-1 rounded ${
                          request.status === 'open' ? 'bg-gray-700 text-gray-300' :
                          request.status === 'assigned' ? 'bg-blue-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {request.status}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          request.priority === 'high' ? 'bg-red-600 text-white' :
                          request.priority === 'medium' ? 'bg-yellow-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {request.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link
            href="/portal/requests/new"
            className="bg-blue-600 hover:bg-blue-700 rounded-lg p-6 text-white text-center transition-colors"
          >
            <div className="text-3xl mb-2">📝</div>
            <h3 className="font-bold mb-2">Submit a Request</h3>
            <p className="text-sm opacity-90">Need something? Let us know</p>
          </Link>
          
          <Link
            href="/portal/documents"
            className="bg-purple-600 hover:bg-purple-700 rounded-lg p-6 text-white text-center transition-colors"
          >
            <div className="text-3xl mb-2">📁</div>
            <h3 className="font-bold mb-2">View Documents</h3>
            <p className="text-sm opacity-90">Access your project files</p>
          </Link>

          <Link
            href="/portal/updates"
            className="bg-green-600 hover:bg-green-700 rounded-lg p-6 text-white text-center transition-colors"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold mb-2">Status Updates</h3>
            <p className="text-sm opacity-90">View weekly reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
