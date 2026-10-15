'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  CalendarPlus,
  ArrowRight,
  XCircle,
} from 'lucide-react';

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [userRes, bookingsRes, labsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/bookings'),
        fetch('/api/labs'),
      ]);

      if (userRes.ok) {
        const uData = await userRes.json();
        setUser(uData.user);
      }
      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setBookings(bData.bookings || []);
      }
      if (labsRes.ok) {
        const lData = await labsRes.json();
        setLabs(lData.labs || []);
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
        alert('Booking cancelled successfully.');
        loadDashboardData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel booking.');
      }
    } catch {
      alert('Error cancelling booking.');
    }
  };

  const approvedCount = bookings.filter((b) => b.status === 'APPROVED').length;
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-linear-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              Academic Resource Portal
            </span>
            <h1 className="text-2xl font-black mt-1">
              Welcome back, {user?.name || 'Scholar'}!
            </h1>
            <p className="text-sm text-blue-100 mt-1">
              Department: {user?.department || 'University Academic Division'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bookings/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 font-bold text-xs rounded-xl shadow-xs hover:bg-blue-50 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Request New Booking
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Bookings"
            value={bookings.length}
            subtitle="Lifetime reservations"
            icon={<Calendar className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Approved Sessions"
            value={approvedCount}
            subtitle="Ready for lab access"
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Pending Review"
            value={pendingCount}
            subtitle="Awaiting admin approval"
            icon={<Clock className="w-5 h-5" />}
            color="amber"
          />
          <StatCard
            title="Active Facilities"
            value={labs.filter((l) => l.status === 'AVAILABLE').length}
            subtitle={`Out of ${labs.length} campus labs`}
            icon={<Building2 className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Recent Bookings Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Recent Bookings</h2>
              <p className="text-xs text-slate-500">Track and manage your laboratory reservation requests</p>
            </div>
            <Link
              href="/bookings"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading your reservations...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No bookings placed yet</p>
                <p className="text-xs text-slate-500 mt-1">Submit your first laboratory reservation today.</p>
                <Link
                  href="/bookings/new"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                >
                  Book a Lab Now &rarr;
                </Link>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-3">Booking ID</th>
                    <th className="px-6 py-3">Facility</th>
                    <th className="px-6 py-3">Schedule</th>
                    <th className="px-6 py-3">Purpose</th>
                    <th className="px-6 py-3">Equipment</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {bookings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-semibold text-blue-900">#{b.id}</td>
                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-slate-900 block">{b.lab.name}</span>
                        <span className="text-[11px] text-slate-500">{b.lab.building}</span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-800 block">
                          {new Date(b.startTime).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 max-w-xs truncate" title={b.purpose}>
                        {b.purpose}
                      </td>
                      <td className="px-6 py-3.5">
                        {b.bookingItems?.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {b.bookingItems.reduce((acc: number, item: any) => acc + item.quantityRequested, 0)} items
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        {b.status === 'PENDING' || b.status === 'APPROVED' ? (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Labs Quick Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Featured Campus Laboratories</h2>
            <Link href="/labs" className="text-xs font-semibold text-blue-700 hover:underline">
              Browse all {labs.length} laboratories &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {labs.slice(0, 3).map((lab) => (
              <div
                key={lab.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={lab.status} size="sm" />
                    <span className="text-xs text-slate-400">Capacity: {lab.capacity}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{lab.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lab.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{lab.building}</span>
                  <Link
                    href={`/labs/${lab.id}`}
                    className="font-bold text-blue-900 hover:text-blue-700 inline-flex items-center gap-0.5"
                  >
                    View details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
