'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CalendarPlus,
  CalendarCheck,
  Shield,
  CheckSquare,
  Layers,
  Cpu,
  Wrench,
  BarChart3,
  Database,
} from 'lucide-react';

interface SidebarProps {
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userRole = 'STUDENT', isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === 'ADMIN' || userRole === 'LAB_MANAGER';

  const userNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Browse Labs', href: '/labs', icon: Building2 },
    { name: 'New Reservation', href: '/bookings/new', icon: CalendarPlus },
    { name: 'My Bookings', href: '/bookings', icon: CalendarCheck },
  ];

  const adminNav = [
    { name: 'Admin Dashboard', href: '/admin', icon: Shield },
    { name: 'Booking Approvals', href: '/admin/approvals', icon: CheckSquare },
    { name: 'Manage Labs', href: '/admin/labs', icon: Layers },
    { name: 'Resource Inventory', href: '/admin/resources', icon: Cpu },
    { name: 'Maintenance', href: '/admin/maintenance', icon: Wrench },
    { name: 'Analytics & Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'MongoDB Audit Stream', href: '/admin/audit', icon: Database },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between z-40 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Main User Navigation */}
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              User Portal
            </p>
            <nav className="space-y-1">
              {userNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-900 font-bold border-r-2 border-blue-900'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-900' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin Navigation */}
          {isAdmin && (
            <div>
              <div className="px-3 flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Administration
                </span>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                  L3 DBMS
                </span>
              </div>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-amber-50/80 text-amber-900 font-bold border-r-2 border-amber-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-amber-800' : 'text-slate-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Database Architecture Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span className="font-medium">Primary DB:</span>
            <span className="font-mono text-emerald-700 font-bold">MySQL 8.0 (ACID)</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-medium">Audit Stream:</span>
            <span className="font-mono text-emerald-700 font-bold">MongoDB (NoSQL)</span>
          </div>
        </div>
      </aside>
    </>
  );
}
