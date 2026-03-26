import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    roles: ['admin', 'agent'],
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V4zM2 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3zM11 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V4zM11 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z"/>
      </svg>
    ),
  },
  {
    id: 'call-report',
    label: 'Call Report',
    roles: ['admin', 'agent'],
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
      </svg>
    ),
  },
  {
    id: 'agents',
    label: 'Agents',
    roles: ['admin'],             // agents cannot see this
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906zM10 13a4 4 0 014 4v1H6v-1a4 4 0 014-4z"/>
      </svg>
    ),
  },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout, isAgent } = useAuth();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const visibleNav = NAV.filter(item => item.roles.includes(user?.role ?? 'admin'));

  function NavItem({ item }) {
    const active = activePage === item.id;
    return (
      <button
        onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-indigo-600 text-white'
            : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100'
        }`}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-3 py-4 border-b border-slate-200 dark:border-zinc-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">Admin OTR</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">Call Center</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* User info + logout */}
      <div className={`p-2 border-t border-slate-200 dark:border-zinc-800 space-y-1`}>
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
            <p className="text-xs font-medium text-slate-700 dark:text-zinc-200 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 capitalize">
              {user.role}{user.agent_number ? ` · ${user.agent_number}` : ''}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Sign out' : undefined}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/>
          </svg>
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors text-xs"
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5"/>
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-3 px-4">
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
        </button>
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/>
          </svg>
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex-1">Admin OTR</span>
        {user && <span className="text-xs text-slate-400 dark:text-zinc-500">{user.name}</span>}
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={`lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 shadow-xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-full bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transition-all duration-200 z-20 ${collapsed ? 'w-[60px]' : 'w-56'}`}>
        {sidebarContent}
      </aside>

      {/* Spacer */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-56'}`} />
    </>
  );
}
