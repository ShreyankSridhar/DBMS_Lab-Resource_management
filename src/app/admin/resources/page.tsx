'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Cpu,
  Plus,
  Building2,
  Filter,
  Search,
  AlertCircle,
  Edit2,
  Check,
} from 'lucide-react';

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedLabId, setSelectedLabId] = useState('ALL');
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [search, setSearch] = useState('');

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabId, setNewLabId] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [newQty, setNewQty] = useState(5);
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
    fetchLabs();
  }, [selectedLabId, selectedCatId]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/resources', window.location.origin);
      if (selectedLabId !== 'ALL') url.searchParams.set('labId', selectedLabId);
      if (selectedCatId !== 'ALL') url.searchParams.set('categoryId', selectedCatId);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabs = async () => {
    try {
      const res = await fetch('/api/labs');
      if (res.ok) {
        const data = await res.json();
        setLabs(data.labs || []);
        if (data.labs?.length > 0 && !newLabId) setNewLabId(data.labs[0].id.toString());
      }
    } catch {}
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          labId: parseInt(newLabId, 10),
          categoryId: parseInt(newCatId, 10),
          totalQuantity: Number(newQty),
          description: newDesc,
          status: 'AVAILABLE',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create resource.');
      }

      setShowModal(false);
      setNewName('');
      setNewDesc('');
      fetchResources();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error creating equipment item.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateQuantity = async (resourceId: number, currentQty: number) => {
    const updated = prompt('Enter new total inventory quantity:', currentQty.toString());
    if (updated === null) return;
    const qty = parseInt(updated, 10);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid non-negative integer.');
      return;
    }

    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalQuantity: qty }),
      });
      if (res.ok) {
        fetchResources();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update quantity');
      }
    } catch {
      alert('Error updating resource.');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-blue-900" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Resource & Equipment Inventory</h1>
            </div>
            <p className="text-xs text-slate-500">
              Track real-time derived availability: total quantity minus active bookings and maintenance windows
            </p>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              if (categories.length > 0 && !newCatId) setNewCatId(categories[0].id.toString());
              if (labs.length > 0 && !newLabId) setNewLabId(labs[0].id.toString());
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-800 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Equipment Item
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Laboratories</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {resources.length} inventory records
          </span>
        </div>

        {/* Resources Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading equipment inventory...</div>
            ) : resources.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No equipment items found.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-6 py-3">Equipment Name</th>
                    <th className="px-6 py-3">Facility</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Total Qty</th>
                    <th className="px-6 py-3">Currently Booked</th>
                    <th className="px-6 py-3">Available Now</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {resources.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-900 block">{r.name}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{r.description}</span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">{r.lab?.name}</td>
                      <td className="px-6 py-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {r.category?.name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {r.totalQuantity}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-amber-700 font-bold">
                        {r.currentlyBooked || 0}
                      </td>
                      <td className="px-6 py-3.5 font-mono font-bold text-emerald-700">
                        {r.availableNow}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleUpdateQuantity(r.id, r.totalQuantity)}
                          className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Adjust Qty
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Add Resource Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Catalog New Hardware Asset</h3>
                <button
                  onClick={() => setShowModal(false)}
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

              <form onSubmit={handleCreateResource} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Equipment Name / Model</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Tektronix 4-Channel Digital Oscilloscope"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Assign to Laboratory</label>
                    <select
                      value={newLabId}
                      onChange={(e) => setNewLabId(e.target.value)}
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

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Taxonomy Category</label>
                    <select
                      value={newCatId}
                      onChange={(e) => setNewCatId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Inventory Count (Units)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Technical Specs & Description</label>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Manufacturer specifications, VRAM, bandwidth limits..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
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
                    disabled={creating}
                    className="px-4 py-2 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50"
                  >
                    {creating ? 'Saving...' : 'Add Equipment Asset'}
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
