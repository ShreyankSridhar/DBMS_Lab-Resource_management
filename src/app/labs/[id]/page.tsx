'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Building2,
  Users,
  MapPin,
  Calendar,
  Cpu,
  Clock,
  CalendarPlus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';


interface LabDetailsProps {
  params: Promise<{ id: string }>;
}

function LabDetailsContent({ params }: LabDetailsProps) {
  const { id } = use(params);
  const [lab, setLab] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Availability checker state
  const [checkStart, setCheckStart] = useState('');
  const [checkEnd, setCheckEnd] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  useEffect(() => {
    fetchLabDetails();
  }, [id]);

  const fetchLabDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/labs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLab(data.lab);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkStart || !checkEnd) return;

    setChecking(true);
    setCheckResult(null);

    try {
      const res = await fetch('/api/bookings/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labId: parseInt(id, 10),
          startTime: new Date(checkStart).toISOString(),
          endTime: new Date(checkEnd).toISOString(),
        }),
      });

      const data = await res.json();
      setCheckResult(data);
    } catch {
      setCheckResult({ isAvailable: false, conflictReason: 'Failed to run slot verification' });
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-12 text-center text-sm text-slate-400">Loading laboratory details...</div>
      </AppShell>
    );
  }

  if (!lab) {
    return (
      <AppShell>
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">Laboratory not found.</p>
          <Link href="/labs" className="mt-2 text-xs text-blue-600 hover:underline block">
            &larr; Back to Laboratories Catalog
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/labs" className="hover:text-blue-900 font-medium">Laboratories</Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{lab.name}</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <StatusBadge status={lab.status} />
              <span className="text-xs text-slate-500 font-mono">LAB-ID #{lab.id}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{lab.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> {lab.building}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {lab.location}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5 text-slate-400" /> {lab.capacity} Seats Capacity
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-3 max-w-2xl leading-relaxed">{lab.description}</p>
          </div>

          <Link
            href={`/bookings/new?labId=${lab.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-800 transition-colors shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            Book This Lab
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Assigned Equipment & Resources */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Assigned Laboratory Resources</h2>
                  <p className="text-xs text-slate-500">Hardware assets, compute workstations, and instrumentation</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {lab.resources?.length || 0} Assets
                </span>
              </div>

              <div className="overflow-x-auto">
                {lab.resources?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No resources assigned to this room.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                        <th className="px-6 py-3">Resource</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Total Qty</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {lab.resources?.map((res: any) => (
                        <tr key={res.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5">
                            <span className="font-bold text-slate-900 block">{res.name}</span>
                            <span className="text-[11px] text-slate-500 line-clamp-1">{res.description}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {res.category?.name || 'General'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">
                            {res.totalQuantity} units
                          </td>
                          <td className="px-6 py-3.5">
                            <StatusBadge status={res.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Upcoming Confirmed Bookings */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Upcoming Active Bookings in this Facility</h2>
                <p className="text-xs text-slate-500">Reserved time slots blocking new bookings</p>
              </div>
              <div className="p-6">
                {lab.bookings?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No active upcoming bookings scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {lab.bookings?.map((b: any) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{b.purpose}</span>
                          <span className="text-[11px] text-slate-500">Booked by: {b.user.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-800 block">
                            {new Date(b.startTime).toLocaleDateString()}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column: Real-Time Slot Availability Checker */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Pre-Flight Slot Checker
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Verify if your desired schedule is available before placing a request.
              </p>

              <form onSubmit={handleCheckSlot} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={checkStart}
                    onChange={(e) => setCheckStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={checkEnd}
                    onChange={(e) => setCheckEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={checking}
                  className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-xs disabled:opacity-50"
                >
                  {checking ? 'Checking availability...' : 'Verify Time Slot'}
                </button>
              </form>

              {checkResult && (
                <div
                  className={`mt-4 p-3 rounded-lg border text-xs ${
                    checkResult.isAvailable
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {checkResult.isAvailable ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Slot Is Available!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Conflict Detected</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {checkResult.isAvailable
                      ? 'No overlapping bookings or maintenance blocks found for this window.'
                      : checkResult.conflictReason}
                  </p>
                </div>
              )}
            </div>

            {/* Maintenance Windows */}
            {lab.maintenances?.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 shadow-xs text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Scheduled Maintenance Notices
                </div>
                <div className="space-y-2">
                  {lab.maintenances.map((m: any) => (
                    <div key={m.id} className="p-2.5 bg-white/80 rounded border border-amber-100">
                      <span className="font-bold text-slate-800 block">{m.description}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {new Date(m.startTime).toLocaleDateString()} - {new Date(m.endTime).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function LabDetailsPage(props: LabDetailsProps) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading lab details...</div>}>
      <LabDetailsContent {...props} />
    </Suspense>
  );
}
