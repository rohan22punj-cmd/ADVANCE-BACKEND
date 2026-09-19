import { Landmark, ShieldCheck, Zap, Clock, ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-banking-bg flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur-sm shadow-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-heading text-xl font-bold text-white transition-opacity hover:opacity-90">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-primary">
              <Landmark size={19} strokeWidth={2.5} />
            </span>
            <span>Ledgerline</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Login</Link>
            <Button variant="primary" size="sm" asChild>
              <Link to="/register">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-banking-text tracking-tight">
                Simple, secure banking for everyone
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-banking-textMuted max-w-2xl mx-auto leading-relaxed">
                Double-entry ledger, ACID transfers, and real-time balances — built for reliability, not hype.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link to="/login">Login to your account</Link>
                </Button>
                <Button variant="secondary" size="lg" asChild className="w-full sm:w-auto">
                  <Link to="/register">Create an account</Link>
                </Button>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
              <div className="p-4">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-primary-light text-primary">
                  <ShieldCheck size={24} />
                </div>
                <p className="font-medium text-banking-text">Bank-grade security</p>
                <p className="text-sm text-banking-textMuted mt-1">Encrypted, audited, compliant</p>
              </div>
              <div className="p-4">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-primary-light text-primary">
                  <Zap size={24} />
                </div>
                <p className="font-medium text-banking-text">Instant transfers</p>
                <p className="text-sm text-banking-textMuted mt-1">ACID, sub-second settlement</p>
              </div>
              <div className="p-4">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-primary-light text-primary">
                  <Clock size={24} />
                </div>
                <p className="font-medium text-banking-text">24/7 access</p>
                <p className="text-sm text-banking-textMuted mt-1">Your money, your schedule</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 sm:py-20 bg-white border-y border-banking-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl font-bold text-banking-text">Why choose Ledgerline?</h2>
              <p className="mt-2 text-banking-textMuted">Built for people who value transparency and control</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <article className="p-6 rounded-lg border border-banking-border bg-banking-bg hover:shadow-cardHover transition-shadow">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-banking-text mb-2">Secure by design</h3>
                <p className="text-banking-textMuted text-sm leading-relaxed">
                  Every transaction is cryptographically verified, double-entry booked, and immutable.
                </p>
              </article>
              {/* Feature 2 */}
              <article className="p-6 rounded-lg border border-banking-border bg-banking-bg hover:shadow-cardHover transition-shadow">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
                  <Zap size={20} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-banking-text mb-2">Real-time settlement</h3>
                <p className="text-banking-textMuted text-sm leading-relaxed">
                  No pending days. Transfers commit atomically with Redis mutex + MongoDB ACID sessions.
                </p>
              </article>
              {/* Feature 3 */}
              <article className="p-6 rounded-lg border border-banking-border bg-banking-bg hover:shadow-cardHover transition-shadow">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
                  <Clock size={20} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-banking-text mb-2">Always available</h3>
                <p className="text-banking-textMuted text-sm leading-relaxed">
                  99.9% uptime SLA. Your accounts and ledger are accessible whenever you need them.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl font-bold text-banking-text">Ready to take control?</h2>
            <p className="mt-3 text-banking-textMuted max-w-xl mx-auto">Open your first account in seconds. No paperwork, no hidden fees.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link to="/register">Get started free</Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-banking-bg border-t border-banking-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-heading font-semibold text-banking-text mb-3">Ledgerline</h4>
              <p className="text-sm text-banking-textMuted leading-relaxed">
                Double-entry financial ledger with ACID guarantees. Built for developers and businesses who need real accounting.
              </p>
            </div>
            <nav>
              <h4 className="font-heading font-semibold text-banking-text mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-banking-textMuted">
                <li><Link to="#" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">API Docs</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Status</Link></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-heading font-semibold text-banking-text mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-banking-textMuted">
                <li><Link to="#" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Blog</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Careers</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-heading font-semibold text-banking-text mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-banking-textMuted">
                <li><Link to="#" className="hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Terms</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Security</Link></li>
                <li><Link to="#" className="hover:text-primary transition-colors">Cookies</Link></li>
              </ul>
            </nav>
          </div>
          <div className="border-t border-banking-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-banking-textLight">
            <p>&copy; 2025 Ledgerline. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}