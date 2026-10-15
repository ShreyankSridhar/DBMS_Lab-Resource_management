'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import {
  CalendarPlus,
  Building2,
  Clock,
  Cpu,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
} from 'lucide-react';

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLabId = searchParams.get('labId');

  const [labs, setLabs] = useState<any[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>(preselectedLabId || '');
  const [labResources, setLabResources] = useState<any[]>([]);
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedItems, setSelectedItems] = useState<Array<{ resourceId: number; quantityRequested: number }>>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/labs')
      .then((res) => res.json())
      .then((data) => {
        setLabs(data.labs || []);
        if (preselectedLabId) setSelectedLabId(preselectedLabId);
        else if (data.labs?.length > 0) setSelectedLabId(data.labs[0].id.toString());
      })
      .catch(() => {});
  }, [preselectedLabId]);

  useEffect(() => {
    if (!selectedLabId) return;
    fetch(`/api/labs/${selectedLabId}`)
      .then((res) => res.json())
      .then((data) => {
        setLabResources(data.lab?.resources || []);
        setSelectedItems([]);
      })
      .catch(() => {});
  }, [selectedLabId]);

  const handleAddItem = (resourceId: number) => {
    if (selectedItems.some((item) => item.resourceId === resourceId)) return;
    setSelectedItems([...selectedItems, { resourceId, quantityRequested: 1 }]);
  };

  const handleRemoveItem = (resourceId: number) => {
    setSelectedItems(selectedItems.filter((item) => item.resourceId !== resourceId));
  };

  const handleQuantityChange = (resourceId: number, qty: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.resourceId === resourceId ? { ...item, quantityRequested: Math.max(1, qty) } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labId: parseInt(selectedLabId, 10),
          purpose,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          items: selectedItems,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to place reservation request.');
      }

      setSuccessMsg(`Booking #${data.booking.id} created successfully! Redirecting...`);
      setTimeout(() => {
        router.push(`/bookings/${data.booking.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Error occurred while creating booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLab = labs.find((l) => l.id.toString() === selectedLabId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <CalendarPlus className="w-5 h-5 text-blue-900" />
          <h1 className="text-xl font-black text-slate-900">Request Laboratory Reservation</h1>
        </div>
        <p className="text-xs text-slate-500">
          Submit a time slot and equipment demand for administrative review and inventory allocation.
        </p>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Reservation Conflict / Error</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <p className="font-bold">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 text-xs">
          {/* Facility Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Select Laboratory Room</label>
              <select
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-600"
              >
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} ({lab.building} - Cap: {lab.capacity})
                  </option>
                ))}
              </select>
            </div>

            {selectedLab && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-center">
                <span className="text-slate-500 text-[11px]">Facility Specs:</span>
                <span className="font-bold text-slate-800">{selectedLab.building} &bull; {selectedLab.location}</span>
                <span className="text-slate-600 text-[11px] mt-0.5">Capacity: {selectedLab.capacity} student seats</span>
              </div>
            )}
          </div>

          {/* Time Slot Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Start Date & Time</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">End Date & Time</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Project Purpose & Academic Justification</label>
            <textarea
              required
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Deep learning transformer fine-tuning for Capstone AI thesis, requires 4 GPU nodes."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Resource & Equipment Allocation */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Request Equipment & Workstations (Optional)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select available hardware assets inside this laboratory for your reservation.
                </p>
              </div>
            </div>

            {labResources.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No specific hardware items cataloged in this lab.</p>
            ) : (
              <div className="space-y-3 mt-3">
                {/* Available to Add */}
                <div className="flex flex-wrap gap-2">
                  {labResources
                    .filter((res) => !selectedItems.some((item) => item.resourceId === res.id))
                    .map((res) => (
                      <button
                        type="button"
                        key={res.id}
                        onClick={() => handleAddItem(res.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-700" />
                        <span>{res.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">(Total: {res.totalQuantity})</span>
                      </button>
                    ))}
                </div>

                {/* Selected Items List */}
                {selectedItems.length > 0 && (
                  <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                        <tr>
                          <th className="px-4 py-2">Requested Resource</th>
                          <th className="px-4 py-2">Quantity</th>
                          <th className="px-4 py-2 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItems.map((item) => {
                          const res = labResources.find((r) => r.id === item.resourceId);
                          return (
                            <tr key={item.resourceId}>
                              <td className="px-4 py-2.5 font-bold text-slate-800">
                                {res?.name || `Resource #${item.resourceId}`}
                              </td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="number"
                                  min={1}
                                  max={res?.totalQuantity || 100}
                                  value={item.quantityRequested}
                                  onChange={(e) =>
                                    handleQuantityChange(item.resourceId, parseInt(e.target.value, 10) || 1)
                                  }
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-center font-mono font-bold"
                                />
                                <span className="ml-2 text-slate-400 text-[11px]">
                                  of {res?.totalQuantity || '?'} max
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.resourceId)}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submitting ? 'Allocating Resources & Submitting...' : 'Submit Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading booking creator...</div>}>
        <BookingForm />
      </Suspense>
    </AppShell>
  );
}
