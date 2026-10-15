'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Calendar, CalendarPlus, XCircle, Search, Filter, Eye } from 'lucide-react';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/bookings', window.location.origin);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking? This will release reserved lab resources.')) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      if (res.ok) {
        alert('Booking cancelled.');
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel booking.');
      }
    } catch {
      alert('Error cancelling booking.');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Reservations</h1>
            <p className="text-xs text-slate-500 mt-1">
              Review your laboratory booking status, approval feedback, and reserved inventory
            </p>
          </div>
          <Link
            href="/bookings/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-800 transition-colors shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            New Reservation
          </Link>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Filter by Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {bookings.length} reservations
          </span>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading reservations...</div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No reservations found</h3>
                <p className="text-xs text-slate-500 mt-1">You have no bookings matching the selected status.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Facility</th>
                    <th className="px-6 py-3">Reserved Time</th>
                    <th className="px-6 py-3">Purpose</th>
                    <th className="px-6 py-3">Equipment Reserved</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-mono font-bold text-blue-900">#{b.id}</td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-900 block">{b.lab.name}</span>
                        <span className="text-[11px] text-slate-500">{b.lab.building} &bull; {b.lab.location}</span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-800 block">
                          {new Date(b.startTime).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 max-w-xs truncate" title={b.purpose}>
                        {b.purpose}
                      </td>
                      <td className="px-6 py-3.5">
                        {b.bookingItems?.length > 0 ? (
                          <div className="space-y-1">
                            {b.bookingItems.map((item: any) => (
                              <span
                                key={item.id}
                                className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] mr-1"
                              >
                                {item.resource?.name} (&times;{item.quantityRequested})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Lab Room Only</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={b.status} />
                        {b.approval?.comments && (
                          <span className="text-[10px] text-slate-500 block mt-1 italic">
                            Note: {b.approval.comments}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/bookings/${b.id}`}
                            className="text-slate-600 hover:text-slate-900 p-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {(b.status === 'PENDING' || b.status === 'APPROVED') && (
                            <button
                              onClick={() => handleCancel(b.id)}
                              className="text-rose-600 hover:text-rose-800 p-1"
                              title="Cancel Reservation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
