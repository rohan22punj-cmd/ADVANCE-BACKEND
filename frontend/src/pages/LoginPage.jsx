import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Landmark, ArrowRight, ShieldCheck, Zap, Layers, Sparkles, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Label } from '../components/ui/input';

export function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';

  async function submit(event) {
    event?.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isRegister) {
        await api.register(form);
        toast.success('Account registered successfully!');
      } else {
        await api.login({ email: form.email, password: form.password });
        toast.success('Welcome back to Ledgerline!');
      }
      onAuthenticated();
    } catch (requestError) {
      setError(requestError.message);
      toast.error(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function handleDemoCredentials() {
    setMode('login');
    setError('');
    setForm({ name: '', email: 'demo@ledgerline.io', password: 'Password123!' });
    toast.info('Loaded demo credentials. Click "Sign in" or register if new.');
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <div className="min-h-screen bg-banking-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <NavLink
            to="/"
            className="inline-flex items-center justify-center gap-3 font-heading text-2xl font-bold text-primary mb-2"
            style={{ textDecoration: 'none' }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-white">
              <Landmark size={24} strokeWidth={2.5} />
            </span>
            <span>Ledgerline</span>
          </NavLink>
          <p className="text-sm text-banking-textMuted">
            Double-Entry Financial Ledger & ACID Transfer Engine
          </p>
        </div>

        {/* Card */}
        <Card className="shadow-cardHover">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">
              {isRegister ? 'Create Your Account' : 'Sign In to Your Ledger'}
            </CardTitle>
            <p className="text-sm text-banking-textMuted mt-1">
              {isRegister
                ? 'Get started with isolated financial accounts and ledger audit trails.'
                : 'Enter your credentials to access live accounts and real-time transfers.'}
            </p>
          </CardHeader>
          <CardContent>
            {/* Mode Switcher */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-banking-bg p-1">
              {['login', 'register'].map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  className={`rounded py-2 text-sm font-medium capitalize transition-all ${
                    mode === value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-banking-textMuted hover:text-banking-text hover:bg-white'
                  }`}
                >
                  {value === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={submit}>
              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={event => setForm({ ...form, name: event.target.value })}
                    placeholder="Alex Morgan"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={event => setForm({ ...form, email: event.target.value })}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span className="text-xs text-banking-textLight">Min. 6 characters</span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={event => setForm({ ...form, password: event.target.value })}
                    placeholder="••••••••"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-banking-textLight hover:text-banking-text"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-md border border-debit/30 bg-debit-light px-3 py-2 text-sm text-debit">
                  {error}
                </div>
              )}

              <Button className="w-full mt-1" type="submit" disabled={busy} size="lg">
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isRegister ? 'Create Account' : 'Sign In'}
                    <ArrowRight size={15} />
                  </span>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-5 pt-4 border-t border-banking-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDemoCredentials}
                className="w-full text-xs text-banking-textMuted border-banking-border hover:bg-banking-bg hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 py-2"
              >
                <Sparkles size={14} className="text-primary" />
                Fill Demo Credentials (1-Click)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center p-3 rounded-lg border border-banking-border bg-white">
            <ShieldCheck size={18} className="text-primary mb-1.5" />
            <span className="text-xs font-medium text-banking-text">ACID Sessions</span>
            <span className="text-[10px] text-banking-textLight">Zero-loss invariant</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg border border-banking-border bg-white">
            <Zap size={18} className="text-primary mb-1.5" />
            <span className="text-xs font-medium text-banking-text">Redis Mutex</span>
            <span className="text-[10px] text-banking-textLight">High concurrency</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg border border-banking-border bg-white">
            <Layers size={18} className="text-primary mb-1.5" />
            <span className="text-xs font-medium text-banking-text">Double-Entry</span>
            <span className="text-[10px] text-banking-textLight">Immutable ledger</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-banking-textLight">
          Engineered with Node.js, Express, MongoDB Replica Set, Redis & React
        </p>
      </div>
    </div>
  );
}