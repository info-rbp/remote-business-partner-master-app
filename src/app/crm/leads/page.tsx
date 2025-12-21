'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { useAuth } from '@/lib/auth-context';
import { Lead, LeadStatus } from '@/types/data-models';

export default function LeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<(Lead & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');

  useEffect(() => {
    if (!user?.orgId) {
      setLoading(false);
      return;
    }

    const db = getDb();
    const leadsRef = collection(db, `orgs/${user.orgId}/leads`);
    const q = query(leadsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (Lead & { id: string })[];
      
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.orgId]);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    if (!user?.orgId) return;

    try {
      const db = getDb();
      const leadRef = doc(db, `orgs/${user.orgId}/leads`, leadId);
      await updateDoc(leadRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleConvertToOpportunity = async (lead: Lead & { id: string }) => {
    if (!user?.orgId) return;

    try {
      const db = getDb();
      
      // Create company if not exists
      let companyId = '';
      if (lead.companyName) {
        const companyRef = await addDoc(collection(db, `orgs/${user.orgId}/companies`), {
          orgId: user.orgId,
          name: lead.companyName,
          relationshipStatus: 'prospect',
          keyContacts: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: user.uid,
        });
        companyId = companyRef.id;
      }

      // Create contact
      const contactRef = await addDoc(collection(db, `orgs/${user.orgId}/contacts`), {
        orgId: user.orgId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        jobTitle: lead.jobTitle,
        linkedCompanyId: companyId || undefined,
        linkedCompanyName: lead.companyName || undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      });

      // Create opportunity
      const opportunityRef = await addDoc(collection(db, `orgs/${user.orgId}/opportunities`), {
        orgId: user.orgId,
        name: `${lead.companyName || lead.firstName + ' ' + lead.lastName} - ${lead.serviceInterest.join(', ')}`,
        companyId: companyId || '',
        companyName: lead.companyName || '',
        primaryContactId: contactRef.id,
        primaryContactName: `${lead.firstName} ${lead.lastName}`,
        probability: lead.fitScore || 50,
        stage: 'qualification',
        nextStep: 'Schedule discovery call',
        owner: user.uid,
        description: lead.message,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      });

      // Update lead
      await updateDoc(doc(db, `orgs/${user.orgId}/leads`, lead.id), {
        status: 'converted',
        convertedToCompanyId: companyId || undefined,
        convertedToContactId: contactRef.id,
        convertedToOpportunityId: opportunityRef.id,
        convertedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      alert('Lead converted successfully!');
    } catch (error) {
      console.error('Error converting lead:', error);
      alert('Failed to convert lead');
    }
  };

  const filteredLeads = filter === 'all' 
    ? leads 
    : leads.filter(lead => lead.status === filter);

  const getStatusColor = (status: LeadStatus) => {
    const colors = {
      new: 'bg-blue-600',
      contacted: 'bg-yellow-600',
      qualified: 'bg-green-600',
      disqualified: 'bg-red-600',
      converted: 'bg-purple-600',
      lost: 'bg-gray-600',
    };
    return colors[status] || 'bg-gray-600';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'text-gray-400',
      medium: 'text-yellow-400',
      high: 'text-orange-400',
      urgent: 'text-red-400',
    };
    return colors[urgency as keyof typeof colors] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading leads...</p>
      </div>
    );
  }

  if (!user?.orgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Please complete org setup first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Leads</h1>
          <div className="flex gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as LeadStatus | 'all')}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700"
            >
              <option value="all">All Leads</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="disqualified">Disqualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Leads', value: leads.length, color: 'bg-blue-600' },
            { label: 'New', value: leads.filter(l => l.status === 'new').length, color: 'bg-blue-500' },
            { label: 'Qualified', value: leads.filter(l => l.status === 'qualified').length, color: 'bg-green-600' },
            { label: 'Converted', value: leads.filter(l => l.status === 'converted').length, color: 'bg-purple-600' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-lg p-6 text-white`}>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm opacity-90">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Leads Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Services
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Urgency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-white font-medium">
                      {lead.firstName} {lead.lastName}
                    </div>
                    {lead.jobTitle && (
                      <div className="text-gray-400 text-sm">{lead.jobTitle}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {lead.companyName || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 text-sm">{lead.email}</div>
                    {lead.phone && (
                      <div className="text-gray-400 text-sm">{lead.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {lead.serviceInterest.slice(0, 2).map((service, i) => (
                        <span
                          key={i}
                          className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
                        >
                          {service}
                        </span>
                      ))}
                      {lead.serviceInterest.length > 2 && (
                        <span className="text-gray-400 text-xs">
                          +{lead.serviceInterest.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${getUrgencyColor(lead.urgency)}`}>
                      {lead.urgency}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-white font-medium">{lead.fitScore || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className={`${getStatusColor(lead.status)} text-white text-xs px-2 py-1 rounded border-none`}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="disqualified">Disqualified</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {lead.status === 'qualified' && !lead.convertedToOpportunityId && (
                      <button
                        onClick={() => handleConvertToOpportunity(lead)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Convert
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No leads found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
