import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Sidebar        from './components/Sidebar';
import Login          from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard      from './pages/Dashboard';
import CallReport     from './pages/CallReport';
import Agents         from './pages/Agents';

function Shell() {
  const { user, loading, mustChangePassword, sessionExpired, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;
  if (mustChangePassword) return <ChangePassword />;

  function renderPage() {
    switch (activePage) {
      case 'call-report': return <CallReport />;
      case 'agents':      return <Agents />;
      default:            return <Dashboard onNavigate={setActivePage} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
      {/* Session expired banner — non-blocking, shown over the app without logging out */}
      {sessionExpired && (
        <div className="z-50 flex items-center justify-between gap-4 px-4 py-2.5 bg-amber-500 text-white text-sm shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01"/>
            </svg>
            <span>Your session has expired. You can continue viewing, but please sign in again when your current call ends.</span>
          </div>
          <button
            onClick={logout}
            className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
          >
            Sign in again
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 min-w-0 pt-14 lg:pt-0 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <Shell />;
}
