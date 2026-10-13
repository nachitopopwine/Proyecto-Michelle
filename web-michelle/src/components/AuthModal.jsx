'use client';

import { useState } from 'react';
import { Lock, User, Leaf, Mail, KeyRound } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { apiRequest, jsonBody } from '../lib/api';
import { Alert, Modal, inputClass } from './ui';
import PrivacyNotice from './PrivacyNotice';

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const TITLES = {
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  forgot: 'Recuperar contraseña',
  reset: 'Nueva contraseña',
};

/**
 * Formulario de acceso con su propio estado: escribir en un campo solo re-renderiza
 * este componente, por lo que los inputs no pierden el foco.
 */
export default function AuthModal({ initialMode = 'login', resetToken, onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', acceptPrivacy: false });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    const captcha = turnstileToken || undefined;

    try {
      if (mode === 'login') {
        const response = await apiRequest('/auth/login', {
          method: 'POST',
          body: jsonBody({ email: form.email, password: form.password, turnstileToken: captcha }),
        });
        onAuthenticated(response.access_token);
        return;
      }

      if (mode === 'register') {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: jsonBody({
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password,
            acceptPrivacy: form.acceptPrivacy,
            turnstileToken: captcha,
          }),
        });
        // Inicia sesión directamente con la cuenta recién creada
        const response = await apiRequest('/auth/login', {
          method: 'POST',
          body: jsonBody({ email: form.email, password: form.password }),
        });
        onAuthenticated(response.access_token);
        return;
      }

      if (mode === 'forgot') {
        const response = await apiRequest('/auth/forgot-password', {
          method: 'POST',
          body: jsonBody({ email: form.email, turnstileToken: captcha }),
        });
        setNotice(response.message);
        return;
      }

      const response = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: jsonBody({ token: resetToken, password: form.password }),
      });
      setForm((current) => ({ ...current, password: '' }));
      setMode('login');
      setNotice(response.message);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (showPrivacy) {
    return (
      <Modal title="Aviso de privacidad" onClose={() => setShowPrivacy(false)} wide>
        <PrivacyNotice />
        <button type="button" onClick={() => setShowPrivacy(false)} className="mt-6 w-full rounded-xl bg-slate-900 p-3 font-medium text-white">
          Volver
        </button>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-700">
          {mode === 'forgot' || mode === 'reset' ? <KeyRound className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
        </div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">{TITLES[mode]}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {mode === 'login' && 'Ingresa para agendar tu hora y ver tus pautas.'}
          {mode === 'register' && 'Crea tu cuenta para agendar y recibir tus pautas.'}
          {mode === 'forgot' && 'Te enviaremos un enlace a tu correo para crear una nueva contraseña.'}
          {mode === 'reset' && 'Escribe tu nueva contraseña (mínimo 8 caracteres).'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <>
            <input value={form.name} onChange={update('name')} placeholder="Nombre completo" autoComplete="name" required minLength={2} className={inputClass} />
            <input value={form.phone} onChange={update('phone')} placeholder="Teléfono (opcional)" type="tel" autoComplete="tel" className={inputClass} />
          </>
        )}
        {mode !== 'reset' && (
          <input type="email" value={form.email} onChange={update('email')} placeholder="Correo electrónico" autoComplete="email" required className={inputClass} />
        )}
        {mode !== 'forgot' && (
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            placeholder={mode === 'reset' ? 'Nueva contraseña' : 'Contraseña'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            className={inputClass}
          />
        )}
        {mode === 'register' && (
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.acceptPrivacy} onChange={update('acceptPrivacy')} required className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600" />
            <span>
              Acepto el{' '}
              <button type="button" onClick={() => setShowPrivacy(true)} className="font-medium text-purple-700 underline">aviso de privacidad</button>{' '}
              y el tratamiento de mis datos de salud para mi atención nutricional.
            </span>
          </label>
        )}

        {turnstileSiteKey && mode !== 'reset' && (
          <Turnstile siteKey={turnstileSiteKey} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
        )}

        <Alert>{error}</Alert>
        <Alert type="success">{notice}</Alert>

        <button disabled={submitting} className="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 p-3.5 font-medium text-white shadow-md transition-all hover:bg-slate-800 disabled:bg-slate-400">
          {mode === 'login' && <User className="h-5 w-5" />}
          {mode === 'register' && <Leaf className="h-5 w-5 text-emerald-400" />}
          {mode === 'forgot' && <Mail className="h-5 w-5" />}
          {submitting ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Guardar contraseña'}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        {mode === 'login' && (
          <>
            <button type="button" onClick={() => switchMode('register')} className="text-purple-700 hover:text-purple-900">¿No tienes cuenta? Regístrate</button>
            <button type="button" onClick={() => switchMode('forgot')} className="text-slate-500 hover:text-slate-700">¿Olvidaste tu contraseña?</button>
          </>
        )}
        {mode !== 'login' && (
          <button type="button" onClick={() => switchMode('login')} className="text-purple-700 hover:text-purple-900">Volver a iniciar sesión</button>
        )}
      </div>
    </Modal>
  );
}
