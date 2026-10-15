'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Calendar,
  Building2,
  Clock,
  Cpu,
  User,
  Shield,
  XCircle,
  CheckCircle,
  FileText,
} from 'lucide-react';


interface BookingDetailsProps {
  params: Promise<{ id: string }>;
}

function BookingDetailsContent({ params }: BookingDetailsProps) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Confirm cancellation of this reservation?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        alert('Booking cancelled.');
        fetchBooking();
      } else {
        const data = await res.json();
        alert(data.error || 'Cancellation failed');
      }
    } catch {
      alert('Error cancelling booking.');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-12 text-center text-xs text-slate-400">Loading booking record...</div>
      </AppShell>
    );
  }

  if (!booking) {
    return (
      <AppShell>
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">Booking record not found or access denied.</p>
          <Link href="/bookings" className="mt-2 text-xs text-blue-600 hover:underline block">
            &larr; Back to My Bookings
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/bookings" className="hover:text-blue-900 font-medium">Reservations</Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Booking #{booking.id}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold text-blue-900">RESERVATION #{booking.id}</span>
              <StatusBadge status={booking.status} />
            </div>
            <h1 className="text-2xl font-black text-slate-900">{booking.purpose}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Submitted on {new Date(booking.createdAt).toLocaleString()}
            </p>
          </div>

          {(booking.status === 'PENDING' || booking.status === 'APPROVED') && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
            >
              <XCircle className="w-4 h-4" /> Cancel Booking
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Time Slot Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
              <h2 className="font-bold text-slate-900 text-sm">Schedule & Time Interval</h2>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 text-[11px] block">Start Time</span>
                  <span className="font-bold text-slate-800 text-sm block mt-0.5">
                    {new Date(booking.startTime).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-slate-600 text-xs">
                    {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 text-[11px] block">End Time</span>
                  <span className="font-bold text-slate-800 text-sm block mt-0.5">
                    {new Date(booking.endTime).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-slate-600 text-xs">
                    {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Reserved Items */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
              <h2 className="font-bold text-slate-900 text-sm">Allocated Equipment & Hardware</h2>
              {booking.bookingItems?.length === 0 ? (
                <p className="text-slate-400 py-2">No individual hardware items reserved. Facility room reservation only.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {booking.bookingItems.map((item: any) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block">{item.resource?.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">Resource ID: #{item.resourceId}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">
                        &times;{item.quantityRequested} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approval Decision Record */}
            {booking.approval && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-900" />
                  <h2 className="font-bold text-slate-900 text-sm">Administrative Resolution Audit</h2>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Decided By:</span>
                    <span className="font-bold text-slate-800">{booking.approval.admin?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Decision Timestamp:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(booking.approval.decidedAt).toLocaleString()}
                    </span>
                  </div>
                  {booking.approval.comments && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="text-slate-500 block">Comments / Notes:</span>
                      <p className="text-slate-800 font-medium italic mt-0.5">{booking.approval.comments}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Facility & User Metadata */}
          <div className="space-y-6 text-xs">
            {/* Lab Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Building2 className="w-4 h-4 text-blue-900" />
                Laboratory Facility
              </div>
              <div className="space-y-1 text-slate-600">
                <span className="font-bold text-slate-900 block text-sm">{booking.lab.name}</span>
                <span className="block">{booking.lab.building}</span>
                <span className="block">{booking.lab.location}</span>
                <span className="block text-slate-500">Capacity: {booking.lab.capacity} seats</span>
              </div>
            </div>

            {/* User Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <User className="w-4 h-4 text-blue-900" />
                Applicant Information
              </div>
              <div className="space-y-1 text-slate-600">
                <span className="font-bold text-slate-900 block">{booking.user.name}</span>
                <span className="block text-slate-500">{booking.user.email}</span>
                <span className="block text-slate-500">{booking.user.department}</span>
                <span className="inline-block mt-1 font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {booking.user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function BookingDetailsPage(props: BookingDetailsProps) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading booking details...</div>}>
      <BookingDetailsContent {...props} />
    </Suspense>
  );
}
