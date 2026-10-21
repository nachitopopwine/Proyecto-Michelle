'use client';

import { useEffect, useState } from 'react';
import { Leaf, LogOut, CalendarPlus, CalendarDays, History, FileText, UserCog, Download, Home } from 'lucide-react';
import { authenticatedRequest, downloadFile, jsonBody } from '../lib/api';
import { formatDate, formatDateTime, isOpenAppointment } from '../lib/format';
import { Alert, Card, EmptyState, Spinner, StatusBadge, secondaryButton } from './ui';
import BookingWidget from './BookingWidget';
import ProfileForm from './ProfileForm';

const TABS = [
  ['upcoming', 'Mis horas', CalendarDays],
  ['book', 'Agendar', CalendarPlus],
  ['history', 'Historial', History],
  ['pautas', 'Mis pautas', FileText],
  ['profile', 'Mi perfil', UserCog],
];

export default function PatientDashboard({ user, initialTab = 'upcoming', onUserUpdated, onLogout, onGoHome }) {
  const [tab, setTab] = useState(initialTab);
  const [appointments, setAppointments] = useState(null);
  const [pautas, setPautas] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadAppointments() {
    try {
      setAppointments(await authenticatedRequest('/appointments'));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadPautas() {
    try {
      setPautas(await authenticatedRequest('/consultations/mine'));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadAppointments();
    loadPautas();
  }, []);

  const cancel = async (appointment) => {
    if (!window.confirm(`¿Cancelar tu hora del ${formatDateTime(appointment.date)}?`)) return;
    setError('');
    setNotice('');
    try {
      await authenticatedRequest(`/appointments/${appointment._id}/cancel`, { method: 'PATCH', body: jsonBody({}) });
      setNotice('Tu hora fue cancelada y el horario quedó disponible.');
    } catch (cancelError) {
      setError(cancelError.message);
    }
    loadAppointments();
  };

  const download = async (path, name) => {
    setError('');
    try {
      await downloadFile(path, name);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  };

  const now = Date.now();
  const upcoming = (appointments ?? []).filter((item) => isOpenAppointment(item) && new Date(item.date).getTime() > now);
  const history = (appointments ?? []).filter((item) => !upcoming.includes(item)).reverse();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={onGoHome} className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-600" />
            <span className="font-serif text-xl font-bold text-purple-900">Michelle Palta</span>
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onGoHome} className="hidden items-center gap-1 text-sm text-slate-600 hover:text-purple-700 sm:flex"><Home className="h-4 w-4" /> Inicio</button>
            <button type="button" onClick={onLogout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-500"><LogOut className="h-4 w-4" /> Salir</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-serif font-bold text-slate-900">Hola, {user.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-slate-500">Aquí puedes ver tus horas, agendar y descargar tus pautas.</p>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Secciones de mi cuenta">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setNotice(''); }}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === key ? 'bg-purple-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
            >
              <Icon className="h-4 w-4" /> {label}
              {key === 'upcoming' && upcoming.length > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs">{upcoming.length}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-4 space-y-4">
          <Alert onClose={() => setError('')}>{error}</Alert>
          <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

          {tab === 'upcoming' && (
            <Card title="Próximas horas" actions={<button type="button" onClick={() => setTab('book')} className={secondaryButton}><CalendarPlus className="h-4 w-4" /> Agendar</button>}>
              {!appointments ? <Spinner /> : upcoming.length === 0 ? (
                <EmptyState>No tienes horas próximas. ¡Agenda tu próxima consulta!</EmptyState>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcoming.map((appointment) => (
                    <li key={appointment._id} className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-semibold text-slate-900">{formatDateTime(appointment.date)}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">{appointment.type} <StatusBadge status={appointment.status} /></p>
                        {appointment.status === 'PENDING' && <p className="mt-1 text-xs text-amber-700">Michelle debe confirmar esta hora. Revisa su estado aquí.</p>}
                      </div>
                      <button type="button" onClick={() => cancel(appointment)} className="self-start text-sm font-medium text-red-600 hover:text-red-800 sm:self-auto">Cancelar hora</button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'book' && (
            <Card title="Agenda tu hora">
              <div className="p-6">
                <BookingWidget onBooked={() => { loadAppointments(); }} />
              </div>
            </Card>
          )}

          {tab === 'history' && (
            <Card title="Historial de horas">
              {!appointments ? <Spinner /> : history.length === 0 ? <EmptyState>Aún no tienes historial.</EmptyState> : (
                <ul className="divide-y divide-slate-100">
                  {history.map((appointment) => (
                    <li key={appointment._id} className="flex flex-wrap items-center justify-between gap-2 p-5">
                      <div>
                        <p className="font-medium text-slate-800">{formatDateTime(appointment.date)}</p>
                        <p className="text-sm text-slate-500">{appointment.type}{appointment.cancelReason ? ` · Motivo: ${appointment.cancelReason}` : ''}</p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'pautas' && (
            <Card title="Mis pautas">
              {!pautas ? <Spinner /> : pautas.length === 0 ? <EmptyState>Cuando Michelle finalice tu consulta, tu pauta aparecerá aquí.</EmptyState> : (
                <ul className="divide-y divide-slate-100">
                  {pautas.map((pauta) => (
                    <li key={pauta._id} className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">Consulta del {formatDate(pauta.appointmentDate ?? pauta.closedAt)}</p>
                          <p className="text-sm text-slate-500">
                            {[pauta.weight && `Peso ${pauta.weight} kg`, pauta.bodyFat && `Grasa ${pauta.bodyFat}%`, pauta.muscleMass && `M. muscular ${pauta.muscleMass} kg`].filter(Boolean).join(' · ') || 'Sin mediciones'}
                          </p>
                        </div>
                        <button type="button" onClick={() => download(`/consultations/${pauta._id}/pdf`, 'pauta.pdf')} className={secondaryButton}>
                          <Download className="h-4 w-4" /> Pauta PDF
                        </button>
                      </div>
                      {pauta.actionPlan && <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{pauta.actionPlan}</p>}
                      {pauta.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pauta.attachments.map((file) => (
                            <button key={file._id} type="button" onClick={() => download(`/files/${file._id}/download`, file.name)} className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100">
                              <Download className="h-3 w-3" /> {file.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'profile' && (
            <Card title="Mi perfil">
              <ProfileForm user={user} onUpdated={onUserUpdated} />
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
