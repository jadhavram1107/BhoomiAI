import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  FileText,
  UploadCloud,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  History,
  Settings,
  LogOut,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { t, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', label: t('overview'), icon: LayoutDashboard },
    { path: '/map', label: t('map_view'), icon: MapPin },
    { path: '/documents', label: t('documents'), icon: FolderOpen },
    { path: '/upload', label: t('upload_record'), icon: UploadCloud },
    { path: '/land-records', label: t('land_records'), icon: FileText },
    { path: '/verification', label: t('verification_queue'), icon: CheckSquare },
    { path: '/validation', label: t('validation_issues'), icon: AlertTriangle },
    { path: '/analytics', label: t('analytics'), icon: BarChart3 },
    { path: '/audit-trail', label: t('audit_trail'), icon: History },
    { path: '/settings', label: t('settings'), icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-50/90 border-r border-slate-200/80 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none shrink-0 overflow-y-auto">
      {/* Menu items */}
      <div className="p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-100/80 text-sky-900 font-semibold border border-sky-200/60 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-600 rounded-r-md" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-700' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors mt-2"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{t('logout')}</span>
        </button>
      </div>

      {/* Bottom Need Help Card matching exact user screenshot */}
      <div className="p-3">
        <div className="bg-cyan-50/70 border border-cyan-200/70 rounded-2xl p-3.5 space-y-2 text-left">
          <div className="flex items-center gap-2 text-cyan-900 font-bold text-xs">
            <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{t('need_help')}</span>
          </div>
          <p className="text-[11px] text-cyan-800/80 leading-relaxed">
            {t('help_desc')}
          </p>
        </div>
      </div>
    </aside>
  );
};
