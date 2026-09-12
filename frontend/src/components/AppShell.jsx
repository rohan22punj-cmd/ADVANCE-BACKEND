import { Landmark, LayoutDashboard, LogOut, ReceiptText, Send } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const navigation = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/transfer', label: 'Transfer', icon: Send },
  { to: '/transactions', label: 'Activity', icon: ReceiptText }
];

export function AppShell({ children, onLogout }) {
  const navigate = useNavigate();
  async function logout() {
    try { await api.logout(); } catch { /* Session is cleared locally even if the server is unavailable. */ }
    onLogout();
    toast.success('You have been signed out.');
    navigate('/');
  }

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800 bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <NavLink to="/dashboard" className="flex items-center gap-3 font-semibold tracking-wide text-white">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-cyan-400 text-slate-950"><Landmark size={19} strokeWidth={2.5} /></span>
          Ledgerline
        </NavLink>
        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}>
            <Icon size={16} />{label}
          </NavLink>)}
        </nav>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut size={15} />Sign out</Button>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-5 py-9">{children}</main>
  </div>;
}
