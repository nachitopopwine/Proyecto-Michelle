'use client';

import { useState } from 'react';
import { authenticatedRequest, jsonBody } from '../lib/api';
import { Alert, Field, inputClass, primaryButton } from './ui';

export default function ProfileForm({ user, onUpdated }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '', currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const updated = await authenticatedRequest('/auth/me', {
        method: 'PATCH',
        body: jsonBody({
          name: form.name,
          phone: form.phone,
          ...(form.newPassword ? { currentPassword: form.currentPassword, newPassword: form.newPassword } : {}),
        }),
      });
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }));
      setNotice('Datos actualizados.');
      onUpdated(updated);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 p-6">
      <Field label="Correo">
        <input value={user.email} disabled className={inputClass} />
      </Field>
      <Field label="Nombre">
        <input value={form.name} onChange={update('name')} required minLength={2} className={inputClass} />
      </Field>
      <Field label="Teléfono">
        <input value={form.phone} onChange={update('phone')} type="tel" className={inputClass} />
      </Field>
      <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Cambiar contraseña (opcional)</legend>
        <input type="password" value={form.currentPassword} onChange={update('currentPassword')} placeholder="Contraseña actual" autoComplete="current-password" className={inputClass} />
        <input type="password" value={form.newPassword} onChange={update('newPassword')} placeholder="Nueva contraseña (mínimo 8)" autoComplete="new-password" minLength={8} className={inputClass} />
      </fieldset>
      <Alert>{error}</Alert>
      <Alert type="success">{notice}</Alert>
      <button disabled={saving} className={primaryButton}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
    </form>
  );
}
