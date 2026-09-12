import { useState } from 'react';
import { Landmark, ArrowRight } from 'lucide-react';
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
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await (isRegister ? api.register(form) : api.login({ email: form.email, password: form.password }));
      onAuthenticated();
    } catch (requestError) {
      setError(requestError.message);
    } finally { setBusy(false); }
  }

  function switchMode(nextMode) { setMode(nextMode); setError(''); }

  return <div className="grid min-h-screen place-items-center bg-slate-950 px-5 py-10">
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center justify-center gap-3 text-xl font-semibold tracking-wide text-white"><span className="grid h-10 w-10 place-items-center rounded-md bg-cyan-400 text-slate-950"><Landmark size={21} /></span>Ledgerline</div>
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle>{isRegister ? 'Create your workspace' : 'Welcome back'}</CardTitle><p className="text-sm text-slate-400">{isRegister ? 'Start tracking every movement with clarity.' : 'Sign in to your ledger dashboard.'}</p></CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-2 rounded-md bg-slate-950 p-1">
            {['login', 'register'].map(value => <button key={value} type="button" onClick={() => switchMode(value)} className={`rounded px-3 py-2 text-sm font-medium capitalize ${mode === value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{value}</button>)}
          </div>
          <form className="space-y-4" onSubmit={submit}>
            {isRegister && <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" required minLength="2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Avery Morgan" /></div>}
            <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength="6" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" /></div>
            {error && <p role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
            <Button className="w-full" type="submit" disabled={busy}>{busy ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}<ArrowRight size={16} /></Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-5 text-center text-xs text-slate-600">Double-entry ledger demo</p>
    </div>
  </div>;
}
