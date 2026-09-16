import { useState } from 'react';
import { Landmark, ArrowRight, ShieldCheck, Zap, Layers, Sparkles } from 'lucide-react';
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
    setForm({
      name: '',
      email: 'demo@ledgerline.io',
      password: 'Password123!'
    });
    toast.info('Loaded demo credentials. Click "Sign in" or register if new.');
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-12 flex flex-col items-center justify-center overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center gap-3 text-2xl font-bold tracking-tight text-white mb-2">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-cyan-500 to-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Landmark size={24} strokeWidth={2.5} />
            </span>
            <span>Ledgerline</span>
          </div>
          <p className="text-sm text-slate-400">
            High-Concurrency Financial Ledger & ACID Transfer Engine
          </p>
        </div>

        {/* Card */}
        <Card className="border-slate-800/80 bg-slate-900/90 backdrop-blur-md shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-100">
              {isRegister ? 'Create Your Account' : 'Sign in to your ledger'}
            </CardTitle>
            <p className="text-xs text-slate-400">
              {isRegister
                ? 'Get started with isolated financial accounts and ledger audit trails.'
                : 'Enter your credentials to access live accounts and real-time transfers.'}
            </p>
          </CardHeader>
          <CardContent>
            {/* Mode Switcher */}
            <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-950 p-1 border border-slate-800/60">
              {['login', 'register'].map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  className={`rounded-md py-2 text-xs font-semibold capitalize transition-all ${
                    mode === value
                      ? 'bg-slate-800 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
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
                  <Label htmlFor="name" className="text-xs text-slate-300">Full Name</Label>
                  <Input
                    id="name"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={event => setForm({ ...form, name: event.target.value })}
                    placeholder="Alex Morgan"
                    className="bg-slate-950/60 border-slate-800 focus:border-cyan-500 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-slate-300">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={event => setForm({ ...form, email: event.target.value })}
                  placeholder="name@company.com"
                  className="bg-slate-950/60 border-slate-800 focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs text-slate-300">Password</Label>
                  <span className="text-[11px] text-slate-500">Min. 6 chars</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={event => setForm({ ...form, password: event.target.value })}
                  placeholder="••••••••"
                  className="bg-slate-950/60 border-slate-800 focus:border-cyan-500 text-sm"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <Button className="w-full mt-2 font-medium" type="submit" disabled={busy}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
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
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDemoCredentials}
                className="w-full text-xs text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-cyan-300 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2 py-2"
              >
                <Sparkles size={14} className="text-cyan-400" />
                Fill Demo Credentials (1-Click)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Highlights / Tech Badges */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center p-2.5 rounded-lg border border-slate-800/60 bg-slate-900/40">
            <ShieldCheck size={16} className="text-emerald-400 mb-1" />
            <span className="text-[11px] font-medium text-slate-300">ACID Sessions</span>
            <span className="text-[10px] text-slate-500">Zero-loss invariant</span>
          </div>
          <div className="flex flex-col items-center p-2.5 rounded-lg border border-slate-800/60 bg-slate-900/40">
            <Zap size={16} className="text-cyan-400 mb-1" />
            <span className="text-[11px] font-medium text-slate-300">Redis Mutex</span>
            <span className="text-[10px] text-slate-500">395 RPS Contention</span>
          </div>
          <div className="flex flex-col items-center p-2.5 rounded-lg border border-slate-800/60 bg-slate-900/40">
            <Layers size={16} className="text-indigo-400 mb-1" />
            <span className="text-[11px] font-medium text-slate-300">Double-Entry</span>
            <span className="text-[10px] text-slate-500">Immutable ledger</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Engineered with Node.js, Express, MongoDB (Replica Set), Redis & React
        </p>
      </div>
    </div>
  );
}
