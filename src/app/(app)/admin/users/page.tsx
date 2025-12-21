'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { OrgMember, UserRole } from '@/types/data-models';
import { Users, Shield, UserCheck, User as UserIcon, AlertCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId) return;

    // Check if user is admin
    if (user.role !== 'admin') {
      setError('Access denied: Admin role required');
      setLoading(false);
      return;
    }

    const loadMembers = async () => {
      try {
        const db = getDb();
        const membersRef = collection(db, `orgs/${user.orgId}/members`);
        const membersQuery = query(membersRef);
        const snapshot = await getDocs(membersQuery);

        const membersData = snapshot.docs.map(doc => ({
          userId: doc.id,
          ...doc.data(),
        })) as OrgMember[];

        setMembers(membersData);
      } catch (err) {
        console.error('Error loading members:', err);
        setError('Failed to load organization members');
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [user]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!user?.orgId) return;

    setUpdating(userId);
    try {
      const db = getDb();
      const memberRef = doc(db, `orgs/${user.orgId}/members`, userId);
      
      // Get current member data to find old role
      const currentMember = members.find(m => m.userId === userId);
      const oldRole = currentMember?.role;
      
      await updateDoc(memberRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      });

      // Write audit log for role change
      try {
        await addDoc(collection(db, `orgs/${user.orgId}/auditLogs`), {
          orgId: user.orgId,
          eventType: 'member_role_changed',
          eventDescription: `Member role changed from ${oldRole} to ${newRole}: ${currentMember?.email}`,
          actor: user.uid,
          actorEmail: user.email,
          actorRole: user.role,
          targetType: 'member',
          targetId: userId,
          targetName: currentMember?.displayName || currentMember?.email,
          changes: {
            role: {
              before: oldRole,
              after: newRole,
            },
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditError) {
        console.error('Failed to write audit log:', auditError);
        // Don't fail the role change if audit logging fails
      }

      // Update local state
      setMembers(members.map(m => 
        m.userId === userId ? { ...m, role: newRole } : m
      ));

    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-purple-600" />;
      case 'staff':
        return <UserCheck className="h-5 w-5 text-blue-600" />;
      case 'client':
        return <UserIcon className="h-5 w-5 text-green-600" />;
      default:
        return <UserIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      staff: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800',
      public: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.public;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || colors.active;
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

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Manage organization members and their roles</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change Role
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getRoleIcon(member.role)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {member.displayName || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-500">{member.userId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(member.role)} capitalize`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(member.status)} capitalize`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value as UserRole)}
                    disabled={updating === member.userId || member.userId === user?.uid}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="client">Client</option>
                    <option value="public">Public</option>
                  </select>
                  {updating === member.userId && (
                    <span className="ml-2 text-xs text-gray-500">Updating...</span>
                  )}
                  {member.userId === user?.uid && (
                    <span className="ml-2 text-xs text-gray-500">(You)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-600">Organization members will appear here.</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Role Permissions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Admin:</strong> Full access to all features including user management</li>
          <li><strong>Staff:</strong> Access to CRM, proposals, projects, and clients</li>
          <li><strong>Client:</strong> Limited access to their own projects and proposals</li>
          <li><strong>Public:</strong> No access to internal features</li>
        </ul>
      </div>
    </div>
  );
}
