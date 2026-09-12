import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './lib/api';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransferPage } from './pages/TransferPage';
import { TransactionsPage } from './pages/TransactionsPage';

const LedgerContext = createContext(null);
export const useLedger = () => useContext(LedgerContext);

function Protected({ authenticated, onLogout, children }) {
  if (!authenticated) return <Navigate to="/" replace />;
  return <AppShell onLogout={onLogout}>{children}</AppShell>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    api.accounts().then(() => setAuthenticated(true)).catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    const clearSession = () => setAuthenticated(false);
    window.addEventListener('ledger:unauthorized', clearSession);
    return () => window.removeEventListener('ledger:unauthorized', clearSession);
  }, []);

  const refreshAccounts = useCallback(() => setRefreshVersion(version => version + 1), []);
  const context = { refreshVersion, refreshAccounts };

  if (authenticated === null) return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-400">Checking your secure session...</div>;

  return <LedgerContext.Provider value={context}>
    <Routes>
      <Route path="/" element={authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onAuthenticated={() => setAuthenticated(true)} />} />
      <Route path="/dashboard" element={<Protected authenticated={authenticated} onLogout={() => setAuthenticated(false)}><DashboardPage /></Protected>} />
      <Route path="/transfer" element={<Protected authenticated={authenticated} onLogout={() => setAuthenticated(false)}><TransferPage /></Protected>} />
      <Route path="/transactions" element={<Protected authenticated={authenticated} onLogout={() => setAuthenticated(false)}><TransactionsPage /></Protected>} />
      <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/'} replace />} />
    </Routes>
  </LedgerContext.Provider>;
}
