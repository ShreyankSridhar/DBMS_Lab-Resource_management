'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Layers,
  Plus,
  Building2,
  Users,
  MapPin,
  Edit2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

export default function AdminLabsPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Lab Form
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/labs');
      if (res.ok) {
        const data = await res.json();
        setLabs(data.labs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          building,
          location,
          capacity: Number(capacity),
          description,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create laboratory.');
      }

      setShowCreateModal(false);
      setName('');
      setBuilding('');
      setLocation('');
      setDescription('');
      fetchLabs();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error creating laboratory.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (labId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/labs/${labId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchLabs();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update lab status');
      }
    } catch {
      alert('Error updating status');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-blue-900" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manage Laboratories</h1>
            </div>
            <p className="text-xs text-slate-500">
              Configure university research rooms, operational statuses, and seating capacities
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-800 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Laboratory
          </button>
        </div>

        {/* Labs Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading facilities...</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Laboratory Name</th>
                    <th className="px-6 py-3">Building & Location</th>
                    <th className="px-6 py-3">Capacity</th>
                    <th className="px-6 py-3">Equipment</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Quick Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {labs.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-mono font-bold text-blue-900">#{lab.id}</td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-900 block">{lab.name}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{lab.description}</span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">
                        {lab.building} &bull; {lab.location}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">
                        {lab.capacity} seats
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-800">
                        {lab._count?.resources || 0} items
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={lab.status} />
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <select
                          value={lab.status}
                          onChange={(e) => handleUpdateStatus(lab.id, e.target.value)}
                          className="text-[11px] border border-slate-200 rounded px-2 py-1 font-medium bg-slate-50 text-slate-700"
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create Lab Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Add New Campus Laboratory</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  &times;
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateLab} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Laboratory Facility Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Cyber-Physical Systems Testbed"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Building</label>
                    <input
                      type="text"
                      required
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      placeholder="e.g., Turing Hall"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Room Location</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Room 304, 3rd Floor"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Seating Capacity</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Purpose, equipment highlights, and safety clearance requirements..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Save Laboratory'}
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
