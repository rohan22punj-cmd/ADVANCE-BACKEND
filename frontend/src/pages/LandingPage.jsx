import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';

export function LandingPage() {
  const navRef = useRef(null);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const counterElements = document.querySelectorAll('.stat-counter');

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(el => el.classList.add('is-visible'));
      counterElements.forEach(el => {
        el.textContent = el.getAttribute('data-target');
      });
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-target'));
          const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
          const duration = 1600;
          const startTime = performance.now();

          const updateCount = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = target * easeProgress;
            el.textContent = decimals > 0 ? currentVal.toFixed(decimals) : Math.floor(currentVal).toLocaleString();
            if (progress < 1) requestAnimationFrame(updateCount);
            else el.textContent = decimals > 0 ? target.toFixed(decimals) : target.toLocaleString();
          };
          requestAnimationFrame(updateCount);
          statsObserver.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    counterElements.forEach(el => statsObserver.observe(el));

    return () => {
      revealObserver.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-surface-canvas text-slate-charcoal min-h-screen flex flex-col font-sans selection:bg-brand-border selection:text-brand-dark">
      

      <header ref={navRef} id="main-nav" className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-card border-b border-gray-200' : 'bg-surface-canvas/90 backdrop-blur-md border-b border-gray-200/70'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group" onClick={(e) => { e.preventDefault(); scrollTo('hero'); }}>
            <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shadow-sm group-hover:scale-[1.03] transition-transform duration-200">
              <span className="material-symbols-outlined text-[20px]" data-icon="account_balance">account_balance</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-charcoal flex items-center gap-1">
              Ledger<span className="text-brand">Line</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-white/70 px-3 py-1.5 rounded-full border border-gray-200/80 shadow-xs">
            {['Features', 'Solutions', 'Security', 'Protocol', 'Governance'].map(label => (
              <button key={label} onClick={() => scrollTo(label.toLowerCase())} className="text-sm font-medium text-slate-muted hover:text-slate-charcoal px-3 py-1.5 rounded-full hover:bg-gray-100/70 transition-all duration-200">{label}</button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-slate-charcoal hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-muted hover:text-slate-charcoal px-4 py-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-white transition-all duration-200">Login</Link>
            <Button asChild size="sm" className="inline-flex items-center gap-1.5">
              <Link to="/register">Get Started
                <span className="material-symbols-outlined text-[16px]" data-icon="arrow_forward">arrow_forward</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200/80 px-6 py-4 bg-white animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-2">
              {['Features', 'Solutions', 'Security', 'Protocol', 'Governance'].map(label => (
                <button
                  key={label}
                  onClick={() => { scrollTo(label.toLowerCase()); setMobileMenuOpen(false); }}
                  className="text-left px-3 py-2.5 text-sm font-medium text-slate-muted hover:text-slate-charcoal hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {label}
                </button>
              ))}
              <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 text-sm font-medium text-slate-charcoal hover:bg-gray-50 rounded-lg transition-colors">Login</Link>
                <Button asChild onClick={() => setMobileMenuOpen(false)} className="w-full justify-center">
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col gap-24 lg:gap-32 pb-20">
        <section id="hero" className="max-w-7xl mx-auto px-6 lg:px-8 pt-12 lg:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            <div className="lg:col-span-6 flex flex-col items-start gap-6 reveal-on-scroll">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-subtle">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-deep">Tier-1 Institutional Infrastructure</span>
                <span className="text-xs text-gray-400 font-medium">|</span>
                <span className="text-xs text-emerald-700 font-medium">FedLine Direct</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold text-slate-charcoal leading-[1.12] tracking-tight">
                Banking, simplified. <br className="hidden sm:inline"/>
                <span className="text-brand">Ledger accuracy</span> you can trust.
              </h1>
              <p className="text-lg text-slate-muted font-normal leading-relaxed max-w-xl">
                Enterprise-grade double-entry accounting paired with millisecond corporate treasury execution. Architected specifically for sovereign wealth, financial institutions, and global scale enterprises.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto pt-2">
                <Button asChild size="lg" className="h-12 px-6 flex items-center justify-center gap-2">
                  <Link to="/register">Open an Account
                    <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild size="lg" className="h-12 px-6 flex items-center justify-center gap-2">
                  <Link to="/register"><span className="material-symbols-outlined text-[18px] text-slate-muted" data-icon="terminal">terminal</span>
                  Schedule Institutional Demo</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4 text-xs font-medium text-slate-subtle border-t border-gray-200/80 w-full">
                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-emerald-600" data-icon="verified">verified</span><span>Continuous Audit Trails</span></div>
                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-brand" data-icon="shield">shield</span><span>Segregated Balance Vaults</span></div>
                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-slate-deep" data-icon="lock">lock</span><span>SOC 2 Type II</span></div>
              </div>
            </div>

            <div className="lg:col-span-6 reveal-on-scroll delay-150">
              <div className="relative mx-auto w-full max-w-xl lg:max-w-none animate-float-subtle">
                <div className="absolute -inset-2 bg-gradient-to-r from-red-100/60 to-amber-100/40 rounded-2xl blur-xl opacity-70 -z-10"></div>
                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-float overflow-hidden">
                  <div className="h-12 px-4.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span></div>
                      <span className="text-gray-300 font-light">|</span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-deep">
                        <span className="material-symbols-outlined text-[16px] text-brand" data-icon="corporate_fare">corporate_fare</span>
                        <span>Treasury Vault • USD Primary Account</span>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span className="text-[11px] font-medium text-emerald-800 tracking-wide uppercase">Audited • Live</span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-gray-100">
                      <div>
                        <span className="text-xs font-semibold text-slate-subtle uppercase tracking-wider block mb-1">Consolidated Cash Reserve</span>
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-charcoal font-sans">$24,849,150.00</span>
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]" data-icon="trending_up">trending_up</span>
                            +4.25% APY
                          </span>
                        </div>
                        <span className="text-xs text-slate-subtle mt-1.5 block">ISO 4217 Currency: USD • Federal Reserve Wire Settle #774-NY</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-slate-deep rounded-md border border-gray-200">Multi-Sig 3/4</span>
                        <span className="px-2.5 py-1 text-xs font-medium bg-brand-subtle text-brand border border-brand-border rounded-md">WORM Logged</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-subtle uppercase tracking-wider pb-2.5">
                        <span>Ledger Journal Event</span><span>State / Balance Shift</span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {[
                          { icon: 'swap_horiz', color: 'text-brand', title: 'Fedwire Settlement #9024', subtitle: '10:42:15 UTC • Clearing House RTGS', amount: '+$1,420,000.00', amountColor: 'text-emerald-700', status: 'Settled Finality', statusColor: 'text-emerald-800 bg-emerald-100/70' },
                          { icon: 'currency_exchange', color: 'text-amber-600', title: 'FX Hedge Liquidity (EUR/USD)', subtitle: '09:18:04 UTC • Cross-Border Route', amount: '-$185,420.00', amountColor: 'text-slate-charcoal', status: 'In Transit', statusColor: 'text-amber-800 bg-amber-100/70' },
                          { icon: 'sync_saved_locally', color: 'text-slate-deep', title: 'Automated Capital Sweep', subtitle: '08:00:00 UTC • Rule: Zero-Drift Policy', amount: '+$250,000.00', amountColor: 'text-emerald-700', status: 'Reconciled', statusColor: 'text-emerald-800 bg-emerald-100/70' },
                        ].map((row, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/70 hover:bg-gray-50 border border-gray-200/70 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center ${row.color}`}><span className="material-symbols-outlined text-[18px]" data-icon={row.icon}>{row.icon}</span></div>
                              <div><div className="text-xs font-semibold text-slate-deep">{row.title}</div><div className="text-[11px] text-slate-subtle">{row.subtitle}</div></div>
                            </div>
                            <div className="text-right"><div className={`text-xs font-bold ${row.amountColor}`}>{row.amount}</div><span className={`text-[10px] font-semibold ${row.statusColor} px-1.5 py-0.2 rounded`}>{row.status}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-slate-subtle">
                      <span className="flex items-center gap-1 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>BLOCK: #8,419,203 [SHA-256 VALIDATED]</span>
                      <NavLink to="/login" className="font-medium text-brand hover:underline cursor-pointer">Explore Explorer →</NavLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 lg:px-8 w-full reveal-on-scroll" id="features">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {[
                { target: 42, suffix: 'B+', label: 'Processed Annually', sub: 'Dual-entry certified volume' },
                { target: 99.999, decimals: 3, suffix: '%', label: 'Settlement Uptime', sub: 'High availability SLAs' },
                { target: 80, suffix: 'ms', prefix: '< ', label: 'Reconciliation Speed', sub: 'Zero-drift execution' },
                { target: 140, suffix: '+', label: 'Regulated Jurisdictions', sub: 'Global treasury access' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center text-center px-4 pt-4 md:pt-0">
                  <div className="text-3xl lg:text-4xl font-extrabold text-slate-charcoal font-sans tracking-tight">
                    {stat.prefix || ''}<span className="stat-counter" data-target={stat.target} data-decimals={stat.decimals || 0}>0</span>{stat.suffix}
                  </div>
                  <span className="text-sm font-medium text-slate-muted mt-1.5">{stat.label}</span>
                  <span className="text-xs text-slate-subtle mt-0.5">{stat.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex flex-col gap-12" id="features-grid">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto reveal-on-scroll">
            <span className="text-xs font-bold uppercase tracking-wider text-brand mb-2">Engineered For Sovereign Scale</span>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-charcoal">Architected for Absolute Precision</h2>
            <p className="text-base text-slate-muted mt-3">Eliminate batch processing latency and reconciliation drift with programmatic, mathematically enforced treasury systems.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: 'flash_on', title: 'Instant Liquidity & Transfers', desc: 'Execute sub-second commercial domestic wires and foreign exchange settlements with integrated zero-drift ledger reconciliation.', metric: '99.999% Settlement Uptime' },
              { icon: 'lock', title: 'Immutable Double-Entry Ledger', desc: 'Every transaction is mathematically balanced against cryptographic journal entries. Guaranteed zero-discrepancy fault tolerance.', metric: 'Cryptographically Verified Audit Trails' },
              { icon: 'monitoring', title: 'Real-Time Balance & Telemetry', desc: 'Stream continuous multi-entity treasury visibility, automatic capital sweep triggers, and dynamic liquidity reserves across regions.', metric: 'Programmable Sweep Protocols' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200/90 p-8 shadow-subtle hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-card transition-all duration-300 flex flex-col justify-between group reveal-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-center text-brand mb-6 group-hover:scale-105 transition-transform duration-200"><span className="material-symbols-outlined text-[24px]" data-icon={f.icon}>{f.icon}</span></div>
                  <h3 className="text-xl font-bold text-slate-charcoal mb-3">{f.title}</h3>
                  <p className="text-sm text-slate-muted leading-relaxed">{f.desc}</p>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-brand">
                  <span>{f.metric}</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform duration-200" data-icon="arrow_forward">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex flex-col gap-12" id="protocol">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto reveal-on-scroll">
            <span className="text-xs font-bold uppercase tracking-wider text-brand mb-2">Deployment Protocol</span>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-charcoal">How LedgerLine Deploys</h2>
            <p className="text-base text-slate-muted mt-3">Onboard enterprise entities, integrate dual-entry APIs, and activate real-time settlement within days—not quarters.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-1/2 left-16 right-16 -translate-y-8 h-[2px] bg-gradient-to-r from-gray-200 via-brand-border to-gray-200 -z-10"></div>
            {[
              { num: '01', bg: 'bg-brand', title: 'Apply in Minutes', desc: 'Seamless enterprise digital KYC, beneficial ownership verification, and organizational document ingestion with automated compliance checks.', check: 'Instant verification engine' },
              { num: '02', bg: 'bg-white text-brand border-2 border-brand-border', title: 'Verify & Connect', desc: 'Synchronize legacy treasury systems via high-throughput REST/gRPC endpoints, configure permissions, and map dual-entry charts of accounts.', check: 'Pre-built ERP & banking adapters' },
              { num: '03', bg: 'bg-brand', title: 'Activate Real-Time Banking', desc: 'Issue sovereign IBANs and dedicated sub-accounts, trigger instant clearing settlements, and automate perpetual reconciliation at scale.', check: 'Full live ledger finality' },
            ].map((step, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-gray-200/90 p-7 shadow-subtle hover:shadow-card transition-all duration-300 flex flex-col gap-4 reveal-on-scroll`} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center text-base font-bold shadow-sm`}>{step.num}</div>
                <div><h4 className="text-lg font-bold text-slate-charcoal mb-2">{step.title}</h4><p className="text-sm text-slate-muted leading-relaxed">{step.desc}</p></div>
                <div className="mt-auto text-xs font-semibold text-slate-subtle flex items-center gap-1.5 pt-2"><span className="material-symbols-outlined text-[16px] text-emerald-600" data-icon="check_circle">check_circle</span>{step.check}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 lg:px-8 w-full reveal-on-scroll" id="security">
          <div className="bg-white rounded-3xl border border-gray-200/90 p-8 lg:p-12 shadow-card">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 flex flex-col gap-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-subtle border border-brand-border w-fit"><span className="material-symbols-outlined text-brand text-[18px]" data-icon="verified_user">verified_user</span><span className="text-xs font-semibold uppercase tracking-wider text-brand">Enterprise Governance</span></div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-charcoal">Custodial Protections & Sovereign Oversight</h3>
                <p className="text-base text-slate-muted leading-relaxed">Balances are held in segregated, bankruptcy-remote accounts through our regulated institutional custodial partners. Eligible deposits feature pass-through FDIC insurance coverage up to applicable federal limits.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {['Multi-sig approval thresholds', 'FIDO2 / WebAuthn tokens', 'Immutable WORM audit logs', '24/7 Dedicated Treasury Officers'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-medium text-slate-deep"><span className="material-symbols-outlined text-brand text-[20px]" data-icon="check_circle">check_circle</span><span>{item}</span></div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: 'shield', title: '256-Bit AES Hardware', desc: 'End-to-end envelope encryption with dedicated Hardware Security Modules (HSM).' },
                  { icon: 'sync_alt', title: 'ISO 20022 Telemetry', desc: 'Standardized structured financial messaging across worldwide RTGS and Fedwire rails.' },
                  { icon: 'policy', title: 'SOC 2 Type II Certified', desc: 'Continuous third-party security audits validating stringent operational controls.' },
                  { icon: 'support_agent', title: '24/7 Custodial Desk', desc: 'Direct hotline to licensed treasury officers for off-market settlements and sweeps.' },
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col gap-2"><span className="material-symbols-outlined text-brand text-[26px]" data-icon={item.icon}>{item.icon}</span><h4 className="text-base font-bold text-slate-charcoal">{item.title}</h4><p className="text-xs text-slate-muted leading-relaxed">{item.desc}</p></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="cta" className="max-w-7xl mx-auto px-6 lg:px-8 w-full reveal-on-scroll">
          <div className="bg-gradient-to-b from-brand-subtle to-white rounded-3xl border border-brand-border p-10 lg:p-16 text-center flex flex-col items-center gap-6 shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center shadow-md"><span className="material-symbols-outlined text-[28px]" data-icon="account_balance">account_balance</span></div>
            <div className="max-w-2xl flex flex-col gap-3">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-charcoal">Ready to elevate your financial infrastructure?</h2>
              <p className="text-base text-slate-muted leading-relaxed">Equip your corporate treasury desk with mathematical certainty, sub-second clearing speeds, and comprehensive regulatory guarantees.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2 w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 px-7 flex items-center justify-center gap-2">
                <Link to="/register">Open an Account Today
                  <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg" className="w-full sm:w-auto h-12 px-7 flex items-center justify-center gap-2">
                <Link to="/register"><span className="material-symbols-outlined text-[18px]" data-icon="calendar_month">calendar_month</span>
                Schedule Institutional Demo</Link>
              </Button>
            </div>
            <div className="text-xs text-slate-subtle mt-2 flex items-center gap-4"><span>• Fast-track corporate onboarding</span><span>• Dedicated API sandbox included</span><span>• No commitment required</span></div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 pt-16 pb-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center"><span className="material-symbols-outlined text-[18px]" data-icon="account_balance">account_balance</span></div><span className="text-lg font-bold tracking-tight text-slate-charcoal">Ledger<span className="text-brand">Line</span></span></div>
              <p className="text-sm text-slate-muted leading-relaxed max-w-sm">Enterprise double-entry ledger platform and real-time treasury infrastructure engineered for institutional corporate banking.</p>
              <div className="flex items-center gap-3 pt-2 text-slate-subtle text-xs"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>All Systems Operational</span></div>
            </div>
            {[
              { title: 'Platform', links: ['Core Ledger Engine', 'Multi-Currency Accounts', 'Fedwire & RTGS Clearing', 'Auto-Reconciliation', 'Developer REST / gRPC'] },
              { title: 'Solutions', links: ['Corporate Treasury', 'Fintech Operators', 'Sovereign Funds', 'Payment Facilitators', 'Custodial Vaults'] },
              { title: 'Governance', links: ['SOC 2 Type II Reports', 'ISO 20022 Framework', 'Cryptographic Audits', 'Multi-Sig Architecture', 'Security Whitepaper'] },
              { title: 'Legal & Custody', links: ['Regulatory Disclosures', 'Terms of Custody', 'Privacy Policy', 'FDIC Pass-Through Info', 'Sub-processors'] },
            ].map((col, i) => (
              <div key={i} className="flex flex-col gap-3"><span className="text-xs font-bold uppercase tracking-wider text-slate-charcoal">{col.title}</span>{col.links.map((link, j) => <a key={j} className="text-sm text-slate-muted hover:text-brand transition-colors" href="#">{link}</a>)}</div>
            ))}
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-subtle">
            <p className="leading-relaxed max-w-3xl">© 2025 LedgerLine Institutional Technologies N.V. All rights reserved. Banking services provided by licensed custodial partner institutions. Balances held in eligible pass-through insured depository accounts subject to federal regulatory limits.</p>
            <div className="flex items-center gap-4 shrink-0 font-medium"><a className="hover:text-slate-charcoal transition-colors" href="#privacy">Privacy</a><a className="hover:text-slate-charcoal transition-colors" href="#terms">Terms</a><a className="hover:text-slate-charcoal transition-colors" href="#security">Security</a></div>
          </div>
        </div>
      </footer>
    </div>
  );
}