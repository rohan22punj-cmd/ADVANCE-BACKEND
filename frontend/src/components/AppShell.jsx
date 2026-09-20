import { Landmark, LayoutDashboard, LogOut, ReceiptText, Send, ShieldCheck, Menu, X, User, Mail, Copy, ChevronDown } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api, getUser } from '../lib/api';
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
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  async function logout() {
    try { await api.logout(); } catch {}
    onLogout();
    toast.success('You have been signed out.');
    navigate('/');
  }

  // close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }

  function copyAccountId() {
    // We'll copy the first account ID if available; fallback to user id
    // For simplicity, copy user._id
    if (user?._id) {
      navigator.clipboard.writeText(user._id);
      toast.success('Account ID copied');
    }
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

          {/* Right: Status, Profile Dropdown, Logout */}
          <div className="flex items-center gap-4">
            {/* Engine Status */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>Engine: Online</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="User menu"
              >
                <div className="h-8 w-8 rounded-full bg-accent-gold flex items-center justify-center text-primary font-medium text-sm">
                  {user?.name ? getInitials(user.name) : '?'}
                </div>
                <ChevronDown size={16} className="text-white/80" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-md border border-banking-border bg-white shadow-cardHover py-1 z-50 animate-in fade-in-20 duration-150">
                  <div className="px-4 py-3 border-b border-banking-border">
                    <p className="font-medium text-banking-text">{user?.name || 'User'}</p>
                    <p className="text-xs text-banking-textMuted">{user?.email || ''}</p>
                  </div>
                  <div className="px-4 py-2 text-xs text-banking-textMuted">
                    <p>Account ID: <span className="font-mono text-banking-text">{user?._id || '—'}</span></p>
                  </div>
                  <div className="px-4 py-2 border-t border-banking-border flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyAccountId}
                      className="h-auto px-2 py-1 text-xs"
                    >
                      <Copy size={12} className="mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="px-2 py-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={logout}
                    >
                      <LogOut size={13} className="mr-1.5" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
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