'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Shield,
  Clock,
  CheckCircle2,
  Building2,
  Cpu,
  Wrench,
  AlertCircle,
  Database,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [labUtilization, setLabUtilization] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick action state
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [reportsRes, pendingRes] = await Promise.all([
        fetch('/api/reports/lab-utilization'),
        fetch('/api/admin/bookings/pending'),
      ]);

      if (reportsRes.ok) {
        const rData = await reportsRes.json();
        setSummary(rData.summary);
        setLabUtilization(rData.labUtilization || []);
      }
      if (pendingRes.ok) {
        const pData = await pendingRes.json();
        setPendingBookings(pData.pendingBookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: 'Approved via Admin Quick Actions' }),
      });
      if (res.ok) {
        loadAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve booking.');
      }
    } catch {
      alert('Error approving booking.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Please enter a rejection reason:', 'Schedule conflict with university priority session.');
    if (!reason) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: reason }),
      });
      if (res.ok) {
        loadAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reject booking.');
      }
    } catch {
      alert('Error rejecting booking.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase">
              <Shield className="w-4 h-4" /> Lab Administration & Resource Allocation
            </div>
            <h1 className="text-2xl font-black mt-1">Institutional Operations Console</h1>
            <p className="text-xs text-slate-300 mt-1">
              Supervising facilities, concurrency locking, equipment inventory, and audit event streams
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/approvals"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors"
            >
              Review Pending ({pendingBookings.length})
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pending Requests"
            value={pendingBookings.length}
            subtitle="Awaiting administrative approval"
            icon={<Clock className="w-5 h-5" />}
            color="amber"
          />
          <StatCard
            title="Total Laboratories"
            value={summary?.totalLabs || 0}
            subtitle="Campus facilities under management"
            icon={<Building2 className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Hardware Inventory"
            value={summary?.totalResources || 0}
            subtitle="Cataloged equipment items"
            icon={<Cpu className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Total Bookings"
            value={summary?.totalBookings || 0}
            subtitle={`Approved: ${summary?.statusCounts?.APPROVED || 0}`}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Pending Requests Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pending Booking Requests Queue</h2>
              <p className="text-xs text-slate-500">
                Action required: review student/faculty purpose and verify equipment demand
              </p>
            </div>
            <Link href="/admin/approvals" className="text-xs font-semibold text-blue-700 hover:underline">
              Open Full Review Portal &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading pending requests...</div>
            ) : pendingBookings.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">All caught up!</h3>
                <p className="text-xs text-slate-500 mt-1">No booking requests are currently pending administrative review.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Applicant</th>
                    <th className="px-6 py-3">Facility</th>
                    <th className="px-6 py-3">Schedule Window</th>
                    <th className="px-6 py-3">Purpose</th>
                    <th className="px-6 py-3">Hardware Demand</th>
                    <th className="px-6 py-3 text-right">Decide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingBookings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-mono font-bold text-blue-900">#{b.id}</td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-900 block">{b.user.name}</span>
                        <span className="text-[11px] text-slate-500">{b.user.email} &bull; {b.user.department}</span>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800">{b.lab.name}</td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-900 block">
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
                          <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                            {b.bookingItems.length} equipment items
                          </span>
                        ) : (
                          <span className="text-slate-400">Room only</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(b.id)}
                            disabled={actionLoading === b.id}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold inline-flex items-center gap-1 border border-emerald-200 transition-colors disabled:opacity-50"
                            title="Approve Booking"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(b.id)}
                            disabled={actionLoading === b.id}
                            className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold inline-flex items-center gap-1 border border-rose-200 transition-colors disabled:opacity-50"
                            title="Reject Booking"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Lab Utilization View Table (Level 3 DBMS Feature) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  SQL View: view_lab_utilization Aggregation
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Direct relational aggregation of approved reservation hours and facility benchmark utilization
              </p>
            </div>
            <Link href="/admin/reports" className="text-xs font-semibold text-blue-700 hover:underline">
              Detailed Analytics &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="px-6 py-3">Lab Name</th>
                  <th className="px-6 py-3">Building & Location</th>
                  <th className="px-6 py-3">Capacity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Approved Bookings</th>
                  <th className="px-6 py-3">Total Booked Hours</th>
                  <th className="px-6 py-3 text-right">Est. Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {labUtilization.map((row) => (
                  <tr key={row.lab_id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{row.lab_name}</td>
                    <td className="px-6 py-3.5 text-slate-500">{row.building} ({row.location})</td>
                    <td className="px-6 py-3.5">{row.capacity} seats</td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={row.lab_status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold">{row.total_approved_bookings}</td>
                    <td className="px-6 py-3.5 font-mono font-bold text-blue-900">{row.total_hours_booked} hrs</td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold">
                      <span className={`${Number(row.estimated_monthly_utilization_pct) > 20 ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {row.estimated_monthly_utilization_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
