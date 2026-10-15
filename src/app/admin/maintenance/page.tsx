'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Wrench,
  Plus,
  Building2,
  Cpu,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function AdminMaintenancePage() {
  const [maintenanceList, setMaintenanceList] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Maintenance Form
  const [showModal, setShowModal] = useState(false);
  const [targetType, setTargetType] = useState<'LAB' | 'RESOURCE'>('LAB');
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMaintenance();
    fetchOptions();
  }, []);

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance');
      if (res.ok) {
        const data = await res.json();
        setMaintenanceList(data.maintenanceList || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [labsRes, resRes] = await Promise.all([
        fetch('/api/labs'),
        fetch('/api/resources'),
      ]);
      if (labsRes.ok) {
        const lData = await labsRes.json();
        setLabs(lData.labs || []);
        if (lData.labs?.length > 0 && !selectedLabId) setSelectedLabId(lData.labs[0].id.toString());
      }
      if (resRes.ok) {
        const rData = await resRes.json();
        setResources(rData.resources || []);
        if (rData.resources?.length > 0 && !selectedResourceId) setSelectedResourceId(rData.resources[0].id.toString());
      }
    } catch {}
  };

  const handleScheduleMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        description,
        status: 'SCHEDULED',
      };

      if (targetType === 'LAB') {
        payload.labId = parseInt(selectedLabId, 10);
      } else {
        payload.resourceId = parseInt(selectedResourceId, 10);
      }

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule maintenance.');
      }

      setShowModal(false);
      setDescription('');
      fetchMaintenance();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error creating maintenance schedule.');
    } finally {
      setScheduling(false);
    }
  };

  const handleMarkCompleted = async (id: number) => {
    if (!confirm('Mark this maintenance window as COMPLETED?')) return;
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) {
        fetchMaintenance();
      } else {
        alert('Failed to update maintenance.');
      }
    } catch {
      alert('Error updating maintenance.');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-5 h-5 text-amber-700" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Facility & Hardware Maintenance</h1>
            </div>
            <p className="text-xs text-slate-500">
              Schedule calibration windows, electrical inspections, and firmware updates that block booking conflicts
            </p>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Schedule Maintenance
          </button>
        </div>

        {/* Maintenance Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading maintenance windows...</div>
            ) : maintenanceList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No scheduled maintenance windows.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Target Asset / Room</th>
                    <th className="px-6 py-3">Schedule Window</th>
                    <th className="px-6 py-3">Task Description</th>
                    <th className="px-6 py-3">Created By</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {maintenanceList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-mono font-bold text-blue-900">#{m.id}</td>
                      <td className="px-6 py-3.5">
                        {m.lab ? (
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <Building2 className="w-3.5 h-3.5 text-blue-900" />
                            <span>{m.lab.name} (Entire Facility)</span>
                          </div>
                        ) : m.resource ? (
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <Cpu className="w-3.5 h-3.5 text-amber-700" />
                            <span>{m.resource.name} (Hardware Unit)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">General Campus Infrastructure</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-900 block">
                          {new Date(m.startTime).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(m.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 max-w-sm truncate" title={m.description}>
                        {m.description}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-medium">
                        {m.creator?.name || 'Administrator'}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleMarkCompleted(m.id)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded border border-emerald-200"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Schedule Maintenance Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Schedule Facility Maintenance</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  &times;
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleScheduleMaintenance} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Maintenance Scope</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetType('LAB')}
                      className={`p-2 rounded-lg font-bold border text-center transition-all ${
                        targetType === 'LAB'
                          ? 'bg-blue-50 border-blue-600 text-blue-900'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Entire Laboratory
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('RESOURCE')}
                      className={`p-2 rounded-lg font-bold border text-center transition-all ${
                        targetType === 'RESOURCE'
                          ? 'bg-blue-50 border-blue-600 text-blue-900'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Specific Hardware Item
                    </button>
                  </div>
                </div>

                {targetType === 'LAB' ? (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Select Laboratory</label>
                    <select
                      value={selectedLabId}
                      onChange={(e) => setSelectedLabId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {labs.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Select Hardware Resource</label>
                    <select
                      value={selectedResourceId}
                      onChange={(e) => setSelectedResourceId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.lab?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Maintenance Scope / Description</label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Annual calibration, firmware flashing, or facility electrical maintenance..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scheduling}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    {scheduling ? 'Scheduling...' : 'Lock Maintenance Window'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
