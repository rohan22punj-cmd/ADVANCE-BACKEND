import { Landmark, LayoutDashboard, LogOut, ReceiptText, Send, Zap, ShieldCheck } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transfer', label: 'Transfer', icon: Send },
  { to: '/transactions', label: 'Activity & Audit', icon: ReceiptText }
];

export function AppShell({ children, onLogout }) {
  const navigate = useNavigate();

  async function logout() {
    try {
      await api.logout();
    } catch {
      // Session is cleared locally even if server is unavailable
    }
    onLogout();
    toast.success('You have been signed out.');
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2.5 font-bold tracking-tight text-white transition-opacity hover:opacity-90"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-cyan-500 to-cyan-300 text-slate-950 shadow-md shadow-cyan-500/20">
                <Landmark size={19} strokeWidth={2.5} />
              </span>
              <span className="text-lg">Ledgerline</span>
            </NavLink>

            {/* Nav Links (Desktop) */}
            <nav className="hidden items-center gap-1 md:flex">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-slate-800/90 text-cyan-300 shadow-sm border border-slate-700/60'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    )
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Engine Status Pill (Hidden on Mobile) */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine: Online (Redis + OCC)</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut size={14} className="mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="flex md:hidden border-t border-slate-800/80 px-4 py-2 bg-slate-950/90 justify-around">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium rounded-md transition-all',
                  isActive ? 'text-cyan-300 bg-slate-900' : 'text-slate-400'
                )
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Ledgerline Double-Entry Financial Engine</span>
          <span className="text-[11px] text-slate-600">
            Node.js 20 • Express • MongoDB Replica Set • Redis 7 • React 19 • Tailwind CSS
          </span>
        </div>
      </footer>
    </div>
  );
}
