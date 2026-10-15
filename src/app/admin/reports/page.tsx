'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Layers,
  Database,
  Cpu,
  Calendar,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [labReport, setLabReport] = useState<any>(null);
  const [resourceReport, setResourceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [labRes, resRes] = await Promise.all([
        fetch('/api/reports/lab-utilization'),
        fetch('/api/reports/resource-usage'),
      ]);

      if (labRes.ok) {
        const lData = await labRes.json();
        setLabReport(lData);
      }
      if (resRes.ok) {
        const rData = await resRes.json();
        setResourceReport(rData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const labUtilization = labReport?.labUtilization || [];
  const categoryBreakdown = resourceReport?.categoryBreakdown || [];
  const peakHours = resourceReport?.peakHours || [];

  const maxPeakCount = Math.max(1, ...peakHours.map((p: any) => p.count));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-blue-900" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Utilization Analytics</h1>
          </div>
          <p className="text-xs text-slate-500">
            Computed database views and aggregations: facility utilization rates, peak hours, and hardware demand
          </p>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Facilities"
            value={labReport?.summary?.totalLabs || 0}
            subtitle="Laboratories monitored"
            icon={<Layers className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Equipment Catalog"
            value={labReport?.summary?.totalResources || 0}
            subtitle="Distinct hardware assets"
            icon={<Cpu className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Approved Sessions"
            value={labReport?.summary?.statusCounts?.APPROVED || 0}
            subtitle="Conducted or upcoming"
            icon={<Calendar className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            title="Pending Queue"
            value={labReport?.summary?.statusCounts?.PENDING || 0}
            subtitle="Awaiting decision"
            icon={<Clock className="w-5 h-5" />}
            color="amber"
          />
        </div>

        {/* Section 1: Lab Utilization View (Level 3 View Demonstration) */}
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
                Formula: (Total Approved Hours) / (12 operating hours &times; 30 days) &times; 100
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              MySQL 8.0 View
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading view metrics...</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-6 py-3">Facility</th>
                    <th className="px-6 py-3">Building</th>
                    <th className="px-6 py-3">Capacity</th>
                    <th className="px-6 py-3">Approved Bookings</th>
                    <th className="px-6 py-3">Cumulative Hours</th>
                    <th className="px-6 py-3">Maintenance Events</th>
                    <th className="px-6 py-3 text-right">Utilization Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {labUtilization.map((row: any) => (
                    <tr key={row.lab_id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{row.lab_name}</td>
                      <td className="px-6 py-3.5 text-slate-600">{row.building} ({row.location})</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800">{row.capacity} seats</td>
                      <td className="px-6 py-3.5 font-mono">{row.total_approved_bookings}</td>
                      <td className="px-6 py-3.5 font-mono font-bold text-blue-900">{row.total_hours_booked} hrs</td>
                      <td className="px-6 py-3.5 font-mono text-amber-700">{row.active_maintenance_count}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, Number(row.estimated_monthly_utilization_pct))}%` }}
                            />
                          </div>
                          <span>{row.estimated_monthly_utilization_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 2: Peak Hours Distribution and Equipment Demand */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Booking Hours Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Peak Reservation Hours</h3>
                <p className="text-xs text-slate-500">Hourly reservation volume across campus facilities</p>
              </div>
              <Clock className="w-4 h-4 text-blue-900" />
            </div>

            <div className="space-y-2 pt-2">
              {peakHours.map((ph: any) => {
                const pct = (ph.count / maxPeakCount) * 100;
                return (
                  <div key={ph.hour} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-mono text-slate-500 font-medium shrink-0">{ph.hour}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                      <div
                        className="bg-indigo-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                    <span className="w-8 font-mono font-bold text-slate-800 text-right shrink-0">
                      {ph.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equipment Demand By Category */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Equipment Demand by Category</h3>
                <p className="text-xs text-slate-500">Demand ratio (demanded units / total inventory)</p>
              </div>
              <Cpu className="w-4 h-4 text-amber-700" />
            </div>

            <div className="space-y-4 pt-2">
              {categoryBreakdown.map((cat: any) => (
                <div key={cat.categoryId} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{cat.categoryName}</span>
                    <span className="font-mono text-slate-500">
                      {cat.totalDemandedUnits} demanded / {cat.totalInventoryUnits} total ({cat.demandRatio}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${cat.demandRatio > 70 ? 'bg-rose-500' : cat.demandRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, cat.demandRatio)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
