'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { authenticatedRequest, jsonBody } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { Alert, Card, EmptyState, Field, Modal, Spinner, inputClass, primaryButton } from '../ui';

function CreatePatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', adminNotes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const patient = await authenticatedRequest('/patients', {
        method: 'POST',
        body: jsonBody({ ...form, phone: form.phone || undefined, adminNotes: form.adminNotes || undefined }),
      });
      onCreated(patient);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nuevo paciente" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre completo"><input value={form.name} onChange={update('name')} required minLength={2} className={inputClass} /></Field>
        <Field label="Correo" hint="El paciente podrá activar su cuenta con “¿Olvidaste tu contraseña?”."><input type="email" value={form.email} onChange={update('email')} required className={inputClass} /></Field>
        <Field label="Teléfono"><input type="tel" value={form.phone} onChange={update('phone')} className={inputClass} /></Field>
        <Field label="Notas internas"><textarea rows={3} value={form.adminNotes} onChange={update('adminNotes')} className={inputClass} /></Field>
        <Alert>{error}</Alert>
        <button disabled={saving} className={`${primaryButton} w-full`}>{saving ? 'Creando...' : 'Crear paciente'}</button>
      </form>
    </Modal>
  );
}

export default function PatientsSection({ onOpenPatient }) {
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setError('');
      setPatients(await authenticatedRequest('/patients'));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const term = search.trim().toLowerCase();
  const visible = (patients ?? []).filter((patient) => !term || `${patient.name} ${patient.email} ${patient.phone ?? ''}`.toLowerCase().includes(term));

  return (
    <Card
      title={`Pacientes${patients ? ` (${patients.length})` : ''}`}
      actions={(
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, correo o teléfono" className={`${inputClass} pl-9 sm:w-64`} />
          </div>
          <button type="button" onClick={() => setCreating(true)} className={primaryButton}><UserPlus className="h-4 w-4" /> Nuevo</button>
        </div>
      )}
    >
      {creating && (
        <CreatePatientModal
          onClose={() => setCreating(false)}
          onCreated={(patient) => { setCreating(false); load(); onOpenPatient(patient._id); }}
        />
      )}
      <div className="px-6 pt-4"><Alert>{error}</Alert></div>
      {!patients && !error ? <Spinner /> : visible.length === 0 ? <EmptyState>No hay pacientes que coincidan.</EmptyState> : (
        <ul className="divide-y divide-slate-100">
          {visible.map((patient) => (
            <li key={patient._id}>
              <button type="button" onClick={() => onOpenPatient(patient._id)} className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-slate-50">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{patient.name}</p>
                  <p className="truncate text-sm text-slate-500">{patient.email}{patient.phone ? ` · ${patient.phone}` : ''}</p>
                </div>
                <div className="hidden text-right text-xs text-slate-500 sm:block">
                  <p>{patient.completedAppointments} consulta{patient.completedAppointments === 1 ? '' : 's'}</p>
                  <p>{patient.nextVisit ? `Próxima: ${formatDate(patient.nextVisit)}` : patient.lastVisit ? `Última: ${formatDate(patient.lastVisit)}` : 'Sin atenciones'}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
