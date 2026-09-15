import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Database, Globe, LogOut, Settings, Bell, User, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const Header: React.FC = () => {
  const { user, language, setLanguage, t, logout } = useAuth();
  const navigate = useNavigate();
  const [loadingSeed, setLoadingSeed] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSeed = async () => {
    setLoadingSeed(true);
    try {
      await api.seedDemoData();
      showToast('Demo records seeded successfully!');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      showToast('Loaded demo synthetic records.');
    } finally {
      setLoadingSeed(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notifications = [
    { id: 'n1', type: 'warning', message: 'Khata #453 OCR confidence at 61% — Review needed', time: '5m ago' },
    { id: 'n2', type: 'critical', message: 'Duplicate record detected: Survey #125/2 Vaijapur (92.4%)', time: '18m ago' },
    { id: 'n3', type: 'success', message: 'Batch of 47 records auto-approved successfully', time: '1h ago' },
  ];

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        {/* Left logo emblem & portal title */}
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white shadow-xs ring-2 ring-emerald-600/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-base md:text-lg leading-tight tracking-tight">
              {t('system_title')}
            </h1>
            <p className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('sub_title')}
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
            <Globe className="w-3.5 h-3.5 ml-1.5 text-slate-500" />
            {(['en', 'mr', 'hi'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-md transition-all ${language === lang ? 'bg-white text-sky-700 font-semibold shadow-xs' : 'hover:text-slate-900'}`}
              >
                {lang === 'en' ? 'EN' : lang === 'mr' ? 'मराठी' : 'हिन्दी'}
              </button>
            ))}
          </div>

          {/* Load Demo Record button */}
          <button
            onClick={handleSeed}
            disabled={loadingSeed}
            className="hidden md:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
            title="Seed prototype demo land records"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            {loadingSeed ? 'Seeding...' : 'Load Demo Data'}
          </button>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-900 text-sm">Notifications</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    {notifications.length} New
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === 'critical' ? 'bg-rose-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <div>
                          <p className="text-xs font-medium text-slate-800 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100">
                  <button
                    onClick={() => { navigate('/audit-trail'); setShowNotifications(false); }}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 w-full text-center"
                  >
                    View Full Audit Trail →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User profile badge with dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2.5 pl-3 border-l border-slate-200 group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-sky-100">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none">{user?.name || 'admin'}</p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{user?.role || 'Administrator'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">{user?.name || 'Administrator'}</p>
                  <p className="text-[11px] text-emerald-700 font-bold truncate">{user?.bhoomi_id || 'BHOOMI-ADMIN-0001'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@bhoomiai.demo'}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> {user?.role || 'ADMIN'}
                  </span>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Settings & Configuration
                  </button>
                  <button
                    onClick={() => { navigate('/audit-trail'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    My Activity Log
                  </button>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      {t('logout')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
