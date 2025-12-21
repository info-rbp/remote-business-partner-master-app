"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRole, useAuth } from '@/lib/auth-context';
import { getDb } from '@/lib/firebase-client';
import { collectionGroup, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/app/components/toast';

function exportToCsv(data: SnapshotItem[]) {
  const headers = ['ID', 'Project ID', 'Generated At', 'Summary', 'Published'];
  const rows = data.map((s) => [
    s.id,
    s.projectId,
    s.generatedAt?.toDate ? s.generatedAt.toDate().toISOString() : new Date(s.generatedAt).toISOString(),
    s.currentStateSummary.replace(/"/g, '""'),
    s.published ? 'Yes' : 'No',
  ]);
  const csv = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `snapshots-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type SnapshotItem = {
  id: string;
  orgId: string;
  projectId: string;
  generatedAt?: any;
  currentStateSummary: string;
  published: boolean;
};

export default function ClientIntelligenceAdminPage() {
  const { isAdmin } = useRole();
  const { user } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<SnapshotItem[]>([]);
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAdmin || !user?.orgId) return;
    const db = getDb();

    // Query latest snapshots for this org via collection group
    let q = query(
      collectionGroup(db, 'clientIntelligence'),
      where('orgId', '==', user.orgId),
      orderBy('generatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SnapshotItem[];
      setItems(data);
    });

    return () => unsub();
  }, [isAdmin, user?.orgId]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterPublished === 'published' && !i.published) return false;
      if (filterPublished === 'draft' && i.published) return false;
      if (projectFilter && i.projectId.indexOf(projectFilter) === -1) return false;
      if (startDate) {
        const t = (i.generatedAt?.toDate?.() ?? new Date(i.generatedAt)).getTime?.() ?? 0;
        if (t < new Date(startDate).getTime()) return false;
      }
      if (endDate) {
        const t = (i.generatedAt?.toDate?.() ?? new Date(i.generatedAt)).getTime?.() ?? 0;
        if (t > new Date(endDate).getTime()) return false;
      }
      return true;
    });
  }, [items, filterPublished, projectFilter, startDate, endDate]);

  if (!isAdmin) {
    return <div className="text-red-500">Admins only</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Client Intelligence Snapshots</h1>
      <div className="bg-gray-800 p-4 rounded flex items-end gap-4">
        <div>
          <label className="block text-xs text-gray-400">Published</label>
          <select className="bg-gray-700 rounded p-2 text-sm" value={filterPublished} onChange={(e) => setFilterPublished(e.target.value as any)}>
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400">Project ID</label>
          <input className="bg-gray-700 rounded p-2 text-sm" placeholder="Filter by project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Start Date</label>
          <input type="date" className="bg-gray-700 rounded p-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">End Date</label>
          <input type="date" className="bg-gray-700 rounded p-2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="ml-auto text-sm text-gray-400">{filtered.length} items</div>
      </div>

      <div className="bg-gray-800 rounded">
        {filtered.length > 0 && (
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-300">Bulk Actions:</span>
              <button
                className="px-2 py-1 rounded bg-green-700 text-white"
                onClick={() => exportToCsv(filtered)}
              >Export CSV</button>
              <button
                className="px-2 py-1 rounded bg-indigo-600 text-white"
                onClick={async () => {
                  try {
                    const db = getDb();
                    const batch = writeBatch(db);
                    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
                    if (!user?.orgId || ids.length === 0) return;
                    ids.forEach((id) => {
                      const item = filtered.find((f) => f.id === id);
                      if (!item) return;
                      const ref = doc(db, `orgs/${user!.orgId}/projects/${item.projectId}/clientIntelligence/${item.id}`);
                      batch.update(ref, { published: true });
                    });
                    await batch.commit();
                    show(`Published ${ids.length} snapshot(s)`, 'success');
                  } catch (e: any) {
                    console.error(e);
                    show(e?.message || 'Bulk publish failed', 'error');
                  }
                }}
              >Publish Selected</button>
              <button
                className="px-2 py-1 rounded bg-gray-700 text-white"
                onClick={async () => {
                  try {
                    const db = getDb();
                    const batch = writeBatch(db);
                    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
                    if (!user?.orgId || ids.length === 0) return;
                    ids.forEach((id) => {
                      const item = filtered.find((f) => f.id === id);
                      if (!item) return;
                      const ref = doc(db, `orgs/${user!.orgId}/projects/${item.projectId}/clientIntelligence/${item.id}`);
                      batch.update(ref, { published: false });
                    });
                    await batch.commit();
                    show(`Unpublished ${ids.length} snapshot(s)`, 'success');
                  } catch (e: any) {
                    console.error(e);
                    show(e?.message || 'Bulk unpublish failed', 'error');
                  }
                }}
              >Unpublish Selected</button>
            </div>
            <button
              className="text-xs text-gray-300 underline"
              onClick={() => setSelectedIds({})}
            >Clear Selection</button>
          </div>
        )}
        <div className="divide-y divide-gray-700">
          {filtered.map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{s.currentStateSummary}</p>
              <p className="text-gray-500 text-xs">Project: {s.projectId}</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!selectedIds[s.id]}
                  onChange={(e) => setSelectedIds((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                />
                <span className="text-xs text-gray-400">Select</span>
              </label>
              <span className={`px-2 py-1 rounded text-xs ${s.published ? 'bg-green-600' : 'bg-gray-700'}`}>{s.published ? 'Published' : 'Draft'}</span>
              <button
                className="px-3 py-1 rounded bg-indigo-600 text-white"
                onClick={async () => {
                  try {
                    const db = getDb();
                    const ref = doc(db, `orgs/${user!.orgId}/projects/${s.projectId}/clientIntelligence/${s.id}`);
                    await updateDoc(ref, { published: !s.published });
                    show(!s.published ? 'Snapshot published' : 'Snapshot unpublished', 'success');
                  } catch (e: any) {
                    console.error(e);
                    show(e?.message || 'Failed to update publish status', 'error');
                  }
                }}
              >{s.published ? 'Unpublish' : 'Publish'}</button>
            </div>
          </div>
          ))}
        </div>
      </div>
    </div>
  );
}
