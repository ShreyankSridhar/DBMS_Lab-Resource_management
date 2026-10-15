'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Database,
  Search,
  Filter,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';

export default function MongoDbAuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [aggregations, setAggregations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditData();
  }, [eventTypeFilter, entityTypeFilter]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/audit/events', window.location.origin);
      if (eventTypeFilter !== 'ALL') url.searchParams.set('event_type', eventTypeFilter);
      if (entityTypeFilter !== 'ALL') url.searchParams.set('entity_type', entityTypeFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
        setAggregations(data.aggregations || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-950 via-slate-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
              <Database className="w-4 h-4" /> Second Database Paradigm: MongoDB Audit History
            </div>
            <h1 className="text-2xl font-black mt-1">Audit Stream & Document Aggregations</h1>
            <p className="text-xs text-slate-300 mt-1">
              Transactional outbox bridge, document collections, schema flexibility, and aggregation pipelines
            </p>
          </div>
          <button
            onClick={fetchAuditData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" /> Sync & Refresh
          </button>
        </div>

        {/* MongoDB Aggregation Pipelines Analytics Cards */}
        {aggregations && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Aggregation 1: Events by Type */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Events by Type ($group)
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                  Pipeline 1
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {aggregations.eventsByType?.map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px] truncate">{item._id}</span>
                    <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregation 2: Events by Entity Type */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Entity Breakdown ($group)
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                  Pipeline 2
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {aggregations.eventsByEntity?.map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">{item._id}</span>
                    <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregation 3: Activity Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Timeline Trend ($dateToString)
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                  Pipeline 3
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {aggregations.activityTimeline?.length === 0 ? (
                  <p className="text-slate-400 py-2">No timeline activity yet.</p>
                ) : (
                  aggregations.activityTimeline?.map((item: any) => (
                    <div key={item._id} className="flex items-center justify-between">
                      <span className="font-mono text-slate-600 text-[11px]">{item._id}</span>
                      <span className="font-mono font-bold text-emerald-700">{item.count} events</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Event Types</option>
              <option value="BOOKING_REQUESTED">BOOKING_REQUESTED</option>
              <option value="BOOKING_APPROVED">BOOKING_APPROVED</option>
              <option value="BOOKING_REJECTED">BOOKING_REJECTED</option>
              <option value="BOOKING_CANCELLED">BOOKING_CANCELLED</option>
              <option value="RESOURCE_CREATED">RESOURCE_CREATED</option>
              <option value="MAINTENANCE_SCHEDULED">MAINTENANCE_SCHEDULED</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="SECURITY_ALERT">SECURITY_ALERT</option>
            </select>

            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Entities</option>
              <option value="BOOKING">BOOKING</option>
              <option value="LAB">LAB</option>
              <option value="RESOURCE">RESOURCE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="AUTH">AUTH</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Total {total} audit records in MongoDB collection
          </span>
        </div>

        {/* Audit Events Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading MongoDB audit events...</div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No audit events match filters.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Event Type</th>
                    <th className="px-6 py-3">Entity</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">Outcome</th>
                    <th className="px-6 py-3 text-right">Document JSON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {events.map((evt) => {
                    const isExpanded = expandedId === evt._id;
                    return (
                      <React.Fragment key={evt._id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : evt._id)}
                          className="hover:bg-slate-50/75 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                            {new Date(evt.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-3.5 font-bold text-slate-900">
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {evt.event_type}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-semibold text-slate-800">{evt.entity_type}</span>{' '}
                            <span className="font-mono text-slate-500">#{evt.entity_id}</span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-600">
                            {evt.actor_email ? (
                              <span>
                                {evt.actor_email}{' '}
                                {evt.actor_role && (
                                  <span className="text-[10px] text-slate-400">({evt.actor_role})</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400">System / Anonymous</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                evt.outcome === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {evt.outcome}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 text-[11px]"
                            >
                              <Code2 className="w-3.5 h-3.5" />
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950 text-emerald-400 font-mono text-[11px]">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span>MongoDB Document ID: {evt._id}</span>
                                <span>Collection: audit_events</span>
                              </div>
                              <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 p-3 bg-slate-900 rounded-lg border border-slate-800">
                                {JSON.stringify(evt, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
