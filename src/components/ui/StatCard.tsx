import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
}: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>{icon}</div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
            {subtitle && <span className="text-slate-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
