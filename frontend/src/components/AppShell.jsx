import { Landmark, LayoutDashboard, LogOut, ReceiptText, Send, ShieldCheck, Menu, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transfer', label: 'Transfer Funds', icon: Send },
  { to: '/transactions', label: 'Activity & Audit', icon: ReceiptText }
];

export function AppShell({ children, onLogout }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function logout() {
    try { await api.logout(); } catch {}
    onLogout();
    toast.success('You have been signed out.');
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-banking-bg flex flex-col">
      {/* Top Navbar - HDFC Style */}
      <header className="sticky top-0 z-40 bg-primary shadow-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-8">
            {/* Brand */}
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2.5 font-heading text-xl font-bold text-white transition-opacity hover:opacity-90"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-primary">
                <Landmark size={19} strokeWidth={2.5} />
              </span>
              <span className="hidden sm:inline">Ledgerline</span>
            </NavLink>

            {/* Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/10'
                    )
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Status & Logout */}
          <div className="flex items-center gap-4">
            {/* Engine Status */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>Engine: Online</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
            >
              <LogOut size={14} className="mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 bg-primary/95 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex gap-2 overflow-x-auto pb-2">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 py-2 px-4 text-xs font-medium rounded-md whitespace-nowrap transition-all',
                      isActive ? 'bg-white/15 text-white' : 'text-white/80'
                    )
                  }
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-banking-border py-4 text-center text-sm text-banking-textLight">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Ledgerline Double-Entry Financial Engine</span>
          <span className="text-xs text-banking-textLight">Node.js • Express • MongoDB Replica Set • Redis • React</span>
        </div>
      </footer>
    </div>
  );
}