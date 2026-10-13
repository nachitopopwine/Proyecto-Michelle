'use client';

import { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import { authenticatedRequest, getToken, setToken } from './lib/api';
import AuthModal from './components/AuthModal';
import Landing from './components/Landing';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/admin/AdminDashboard';

export default function NutricionistaSystem() {
  // undefined = verificando sesión, null = sin sesión
  const [user, setUser] = useState(undefined);
  const [view, setView] = useState('landing'); // landing | account
  const [authModal, setAuthModal] = useState(null); // null | { mode, resetToken? }

  async function loadSession() {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const profile = await authenticatedRequest('/auth/me');
      setUser(profile);
      setView('account');
    } catch {
      setToken(null);
      setUser(null);
    }
  }

  // Restaura la sesión guardada solo en el navegador (evita errores de hidratación)
  useEffect(() => {
    loadSession();

    const resetToken = new URLSearchParams(window.location.search).get('reset');
    if (resetToken) {
      setAuthModal({ mode: 'reset', resetToken });
      window.history.replaceState(null, '', window.location.pathname);
    }

    const handleExpired = () => {
      setToken(null);
      setUser(null);
      setView('landing');
      setAuthModal({ mode: 'login' });
    };
    window.addEventListener('session-expired', handleExpired);
    return () => window.removeEventListener('session-expired', handleExpired);
  }, []);

  const handleAuthenticated = async (token) => {
    setToken(token);
    setAuthModal(null);
    await loadSession();
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setView('landing');
  };

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Leaf className="h-8 w-8 animate-pulse text-emerald-600" />
      </div>
    );
  }

  const modal = authModal && (
    <AuthModal
      initialMode={authModal.mode}
      resetToken={authModal.resetToken}
      onClose={() => setAuthModal(null)}
      onAuthenticated={handleAuthenticated}
    />
  );

  if (user && view === 'account') {
    return user.role === 'ADMIN' ? (
      <AdminDashboard user={user} onUserUpdated={setUser} onLogout={handleLogout} />
    ) : (
      <PatientDashboard user={user} onUserUpdated={setUser} onLogout={handleLogout} onGoHome={() => setView('landing')} />
    );
  }

  return (
    <>
      {modal}
      <Landing
        user={user}
        onLogin={() => setAuthModal({ mode: 'login' })}
        onLogout={handleLogout}
        onOpenAccount={() => setView('account')}
      />
    </>
  );
}
