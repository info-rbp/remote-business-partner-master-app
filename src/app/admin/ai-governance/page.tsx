"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth, useRole } from '@/lib/auth-context';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { useToast } from '@/app/components/toast';

type AIGovernanceSettings = {
  enabled: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  enabledTasks?: string[];
  disabledTasks?: string[];
  requireAcknowledgement?: boolean;
};

const DEFAULTS: AIGovernanceSettings = {
  enabled: true,
  sensitivityLevel: 'medium',
  enabledTasks: [],
  disabledTasks: [],
  requireAcknowledgement: true,
};

// Known AI tasks (keep in sync with backend registry)
const KNOWN_TASKS: { id: string; label: string }[] = [
  { id: 'proposal_sanity_check', label: 'Proposal Sanity Check' },
  { id: 'engagement_summary', label: 'Engagement Summary' },
  { id: 'decision_brief', label: 'Decision Brief' },
  { id: 'client_engagement_summary', label: 'Client Engagement Summary' },
];

export default function AIGovernanceAdminPage() {
  const { isAdmin } = useRole();
  const { user } = useAuth();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AIGovernanceSettings>(DEFAULTS);

  useEffect(() => {
    const run = async () => {
      if (!isAdmin || !user?.orgId) return;
      setLoading(true);
      try {
        const db = getDb();
        const ref = doc(db, `orgs/${user.orgId}/settings/ai`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Partial<AIGovernanceSettings>;
          setSettings({ ...DEFAULTS, ...(data || {}) });
        } else {
          setSettings(DEFAULTS);
        }
      } catch (e: any) {
        console.error(e);
        show(e?.message || 'Failed to load governance settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isAdmin, user?.orgId, show]);

  const taskStates = useMemo(() => {
    const enabledSet = new Set(settings.enabledTasks || []);
    const disabledSet = new Set(settings.disabledTasks || []);
    return KNOWN_TASKS.map((t) => {
      // explicit disabled wins; otherwise explicit enabled; else default enabled
      const isDisabled = disabledSet.has(t.id);
      const isEnabled = enabledSet.has(t.id) || (!isDisabled && (settings.enabledTasks?.length ?? 0) === 0);
      return { ...t, enabled: isEnabled, explicitlyEnabled: enabledSet.has(t.id), explicitlyDisabled: isDisabled };
    });
  }, [settings]);

  const updateTaskToggle = (taskId: string, next: boolean) => {
    const enabled = new Set(settings.enabledTasks || []);
    const disabled = new Set(settings.disabledTasks || []);
    if (next) {
      disabled.delete(taskId);
      enabled.add(taskId);
    } else {
      enabled.delete(taskId);
      disabled.add(taskId);
    }
    setSettings((s) => ({ ...s, enabledTasks: Array.from(enabled), disabledTasks: Array.from(disabled) }));
  };

  const save = async () => {
    if (!user?.orgId) return;
    setSaving(true);
    try {
      const db = getDb();
      const ref = doc(db, `orgs/${user.orgId}/settings/ai`);
      const payload: AIGovernanceSettings = {
        enabled: !!settings.enabled,
        sensitivityLevel: settings.sensitivityLevel || 'medium',
        enabledTasks: settings.enabledTasks || [],
        disabledTasks: settings.disabledTasks || [],
        requireAcknowledgement: settings.requireAcknowledgement ?? true,
      };
      await setDoc(ref, payload, { merge: true });
      
      // Log audit entry
      const auditLog = {
        action: 'governance_settings_updated',
        entityType: 'ai_governance',
        actorId: user.uid,
        changes: {
          enabled: settings.enabled,
          sensitivityLevel: settings.sensitivityLevel,
          requireAcknowledgement: settings.requireAcknowledgement,
        },
        timestamp: new Date().toISOString(),
      };
      const auditRef = collection(db, `orgs/${user.orgId}/auditLogs`);
      await addDoc(auditRef, auditLog);
      
      show('AI governance settings saved', 'success');
    } catch (e: any) {
      console.error(e);
      show(e?.message || 'Failed to save governance settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <div className="text-red-500">Admins only</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI Governance</h1>
      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="bg-gray-800 p-4 rounded space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Enable AI Features</p>
                <p className="text-xs text-gray-400">Globally enable/disable AI-driven features</p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <span className="text-sm">{settings.enabled ? 'Enabled' : 'Disabled'}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!settings.enabled}
                  onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
                />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Sensitivity Level</p>
                <p className="text-xs text-gray-400">Higher sensitivity reduces speculative outputs</p>
              </div>
              <select
                className="bg-gray-700 rounded p-2 text-sm"
                value={settings.sensitivityLevel}
                onChange={(e) => setSettings((s) => ({ ...s, sensitivityLevel: e.target.value as any }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Require Acknowledgement</p>
                <p className="text-xs text-gray-400">Human review required before acting on outputs</p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <span className="text-sm">{settings.requireAcknowledgement ? 'Required' : 'Optional'}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!settings.requireAcknowledgement}
                  onChange={(e) => setSettings((s) => ({ ...s, requireAcknowledgement: e.target.checked }))}
                />
              </label>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">Per-Task Controls</p>
              <button
                className="text-xs text-gray-300 underline"
                onClick={() => setSettings(DEFAULTS)}
                disabled={saving}
              >Reset to defaults</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {taskStates.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-gray-900/40 rounded p-3">
                  <div>
                    <p className="text-sm">{t.label}</p>
                    <p className="text-[11px] text-gray-400">{t.id}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span className="text-xs">{t.enabled ? 'Enabled' : 'Disabled'}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={t.enabled}
                      onChange={(e) => updateTaskToggle(t.id, e.target.checked)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="px-4 py-2 rounded bg-indigo-600 disabled:opacity-50"
              onClick={save}
              disabled={saving}
            >{saving ? 'Saving…' : 'Save Settings'}</button>
          </div>
        </>
      )}
    </div>
  );
}
