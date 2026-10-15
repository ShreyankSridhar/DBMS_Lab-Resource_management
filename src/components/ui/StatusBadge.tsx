import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'APPROVED':
      case 'AVAILABLE':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
      case 'SCHEDULED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REJECTED':
      case 'DECOMMISSIONED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MAINTENANCE':
      case 'IN_PROGRESS':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CANCELLED':
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'RESERVED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDotColor = () => {
    switch (normalized) {
      case 'APPROVED':
      case 'AVAILABLE':
      case 'COMPLETED':
        return 'bg-emerald-500';
      case 'PENDING':
      case 'SCHEDULED':
        return 'bg-amber-500';
      case 'REJECTED':
      case 'DECOMMISSIONED':
        return 'bg-rose-500';
      case 'MAINTENANCE':
      case 'IN_PROGRESS':
        return 'bg-orange-500';
      case 'CANCELLED':
      case 'INACTIVE':
        return 'bg-slate-400';
      case 'RESERVED':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${getStyle()} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      {normalized}
    </span>
  );
}
