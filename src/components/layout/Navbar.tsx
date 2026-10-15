'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, Shield, Menu } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  const handleMarkAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({}) });
      setUnreadCount(0);
      fetchNotifications();
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            U
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">UniLab</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Resources Allocation</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) handleMarkAsRead();
            }}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAsRead} className="text-[11px] text-blue-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 ${n.readAt ? 'bg-white' : 'bg-blue-50/50'}`}>
                      <p className="text-slate-800 font-medium">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        {currentUser ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
              <div className="flex items-center gap-1 justify-end">
                {currentUser.role === 'ADMIN' || currentUser.role === 'LAB_MANAGER' ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    <Shield className="w-2.5 h-2.5" /> {currentUser.role}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500 uppercase">{currentUser.role}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
