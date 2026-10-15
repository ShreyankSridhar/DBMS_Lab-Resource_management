'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  CheckSquare,
  Clock,
  Check,
  X,
  AlertCircle,
  Building2,
  User,
  Calendar,
  Cpu,
} from 'lucide-react';

export default function BookingApprovalsPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bookings/pending');
      if (res.ok) {
        const data = await res.json();
        setPending(data.pendingBookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedBooking) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const endpoint = `/api/admin/bookings/${selectedBooking.id}/${decision.toLowerCase()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comments.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${decision} booking.`);
      }

      alert(`Booking #${selectedBooking.id} successfully marked as ${decision}.`);
      setSelectedBooking(null);
      setComments('');
      fetchPending();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error executing administrative decision.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-amber-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Booking Approvals Queue</h1>
          </div>
          <p className="text-xs text-slate-500">
            Enforce institutional lab guidelines, prevent double-bookings, and allocate limited equipment inventory
          </p>
        </div>

        {/* Pending Requests Cards */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading pending requests...</div>
        ) : pending.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
            <Clock className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Approvals Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1">There are no pending student or faculty reservations awaiting action.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                        REQUEST #{b.id}
                      </span>
                      <StatusBadge status={b.status} size="sm" />
                      <span className="text-[11px] text-slate-400 font-mono">
                        Submitted: {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{b.purpose}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          <strong className="text-slate-800">{b.user.name}</strong> ({b.user.department})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.lab.name} ({b.lab.building})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(b.startTime).toLocaleDateString()} &bull;{' '}
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Hardware Items */}
                    {b.bookingItems?.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-400 text-[11px] font-semibold">Equipment Requested:</span>
                        {b.bookingItems.map((item: any) => (
                          <span
                            key={item.id}
                            className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]"
                          >
                            {item.resource?.name} (&times;{item.quantityRequested})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                    <button
                      onClick={() => {
                        setSelectedBooking(b);
                        setComments('');
                        setErrorMsg(null);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Review & Decide
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Decision Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  Decision on Request #{selectedBooking.id}
                </h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
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

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Applicant & Purpose:</span>
                  <span className="font-bold text-slate-800">{selectedBooking.user.name}</span> &mdash;{' '}
                  <span className="text-slate-700">{selectedBooking.purpose}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Facility & Window:</span>
                  <span className="font-bold text-slate-800">{selectedBooking.lab.name}</span> (
                  {new Date(selectedBooking.startTime).toLocaleString()} to{' '}
                  {new Date(selectedBooking.endTime).toLocaleTimeString()})
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 mt-3">
                    Administrative Feedback / Comments (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Provide notes, equipment usage guidelines, or rejection justification..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('REJECTED')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('APPROVED')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Approve Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
