import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Activity, TrendingUp, LogOut, DollarSign, X } from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/opportunities', icon: Users, label: 'Opportunities' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/activity', icon: Activity, label: 'Activity Log' },
  { to: '/compensation', icon: DollarSign, label: 'Compensation' },
];

export const Sidebar = ({ onLogout, mobileOpen, onMobileClose }) => (
  <aside className={`
    fixed md:static inset-y-0 left-0 z-50
    w-64 min-h-screen bg-navy-900 flex flex-col flex-shrink-0
    transform transition-transform duration-200 ease-in-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  `}>
    {/* Header */}
    <div className="px-6 py-5 border-b border-navy-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">VO-CRM</p>
          <p className="text-slate-400 text-xs">Insurance & Investment</p>
        </div>
      </div>
      {/* Close button — mobile only */}
      <button
        onClick={onMobileClose}
        className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"
        aria-label="Close menu"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Nav links */}
    <nav className="flex-1 px-3 py-4 flex flex-col">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onMobileClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-teal-500/20 text-teal-400'
                : 'text-slate-400 hover:bg-navy-700 hover:text-white'
            }`
          }
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {label}
        </NavLink>
      ))}

      {/* Logout — directly below Compensation */}
      <button
        onClick={() => { onLogout(); onMobileClose?.(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-navy-700 hover:text-white transition-colors duration-150 mt-1"
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        Logout
      </button>
    </nav>
  </aside>
);
