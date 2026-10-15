'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Building2, Search, Filter, Users, CalendarPlus, Cpu, MapPin } from 'lucide-react';

export default function LabsDirectoryPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabs();
  }, [statusFilter]);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/labs', window.location.origin);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLabs();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">University Laboratories</h1>
            <p className="text-xs text-slate-500 mt-1">
              Browse campus research facilities, specialized equipment suites, and room capacities
            </p>
          </div>
          <Link
            href="/bookings/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-800 transition-colors shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            Book a Laboratory
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by lab name, building, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600 w-full sm:w-auto"
            >
              <option value="ALL">All Operational Statuses</option>
              <option value="AVAILABLE">Available Only</option>
              <option value="MAINTENANCE">Under Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Labs Grid */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading laboratories catalog...</div>
        ) : labs.length === 0 ? (
          <div className="p-12 bg-white rounded-xl border border-slate-200 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No laboratories found</h3>
            <p className="text-xs text-slate-500 mt-1">Try refining your keyword search or clearing the status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((lab) => (
              <div
                key={lab.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusBadge status={lab.status} />
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <Users className="w-3 h-3" /> {lab.capacity} seats
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{lab.name}</h3>

                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{lab.building}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{lab.location}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                    {lab.description || 'Dedicated academic laboratory facility for student projects and faculty research.'}
                  </p>
                </div>

                <div className="px-6 py-3.5 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    {lab._count?.resources || 0} Assets
                  </span>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/labs/${lab.id}`}
                      className="font-bold text-slate-700 hover:text-slate-900"
                    >
                      Inspect
                    </Link>
                    {lab.status === 'AVAILABLE' && (
                      <Link
                        href={`/bookings/new?labId=${lab.id}`}
                        className="font-bold text-blue-900 hover:text-blue-700"
                      >
                        Book &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
