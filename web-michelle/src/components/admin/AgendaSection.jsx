'use client';

import { useState } from 'react';
import { Search, BookOpen, Check, XCircle, User, Video, Home, MapPin, Eye, RefreshCw } from 'lucide-react';
import { authenticatedRequest, jsonBody } from '../../lib/api';
import { formatTime, formatYmd, isOpenAppointment, todayYmd, ymdOf } from '../../lib/format';
import { Alert, Card, EmptyState, Spinner, StatusBadge, inputClass, secondaryButton } from '../ui';

const FILTERS = [
  ['upcoming', 'Próximas'],
  ['today', 'Hoy'],
  ['pending', 'Por confirmar'],
  ['past', 'Pasadas'],
  ['all', 'Todas'],
];

const TYPE_ICONS = { Online: Video, Presencial: Home, Domicilio: MapPin };

export default function AgendaSection({ appointments, error, onReload, onOpenConsultation, onOpenPatient }) {
  const [filter, setFilter] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const changeStatus = async (appointment, status) => {
    let reason;
    if (status === 'CANCELLED') {
      reason = window.prompt(`Motivo para rechazar o cancelar la hora de ${appointment.patientName} (se enviará al paciente):`, '');
      if (reason === null) return;
    }
    setActionError('');
    setNotice('');
    try {
      await authenticatedRequest(`/appointments/${appointment._id}/status`, {
        method: 'PATCH',
        body: jsonBody({ status, reason: reason || undefined }),
      });
      setNotice(status === 'CONFIRMED' ? `Hora confirmada. Se avisó a ${appointment.patientName}.` : 'Hora cancelada. El horario quedó libre y se avisó al paciente.');
    } catch (changeError) {
      setActionError(changeError.message);
    }
    onReload();
  };

  const today = todayYmd();
  const now = Date.now();
  const term = search.trim().toLowerCase();
  const visible = (appointments ?? [])
    .filter((appointment) => {
      const time = new Date(appointment.date).getTime();
      if (filter === 'today') return ymdOf(appointment.date) === today;
      if (filter === 'upcoming') return time >= now - 2 * 60 * 60 * 1000 && isOpenAppointment(appointment);
      if (filter === 'pending') return appointment.status === 'PENDING';
      if (filter === 'past') return time < now || !isOpenAppointment(appointment);
      return true;
    })
    .filter((appointment) => !term || `${appointment.patientName} ${appointment.patientEmail}`.toLowerCase().includes(term));
  if (filter === 'past' || filter === 'all') visible.reverse();

  const groups = [];
  for (const appointment of visible) {
    const day = ymdOf(appointment.date);
    const group = groups.at(-1);
    if (group?.day === day) group.items.push(appointment);
    else groups.push({ day, items: [appointment] });
  }

  const pendingCount = (appointments ?? []).filter((item) => item.status === 'PENDING').length;

  return (
    <Card
      title="Agenda"
      actions={(
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente..." className={`${inputClass} pl-9 sm:w-56`} />
          </div>
          <button type="button" onClick={onReload} className={secondaryButton} title="Actualizar"><RefreshCw className="h-4 w-4" /></button>
        </div>
      )}
    >
      <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-6 py-3">
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${filter === key ? 'bg-purple-100 text-purple-800' : 'text-slate-500 hover:text-slate-800'}`}>
            {label}{key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-6 pt-4">
        <Alert>{error}</Alert>
        <Alert onClose={() => setActionError('')}>{actionError}</Alert>
        <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      </div>

      {!appointments && !error ? <Spinner /> : visible.length === 0 ? (
        <EmptyState>No hay horas en esta vista.</EmptyState>
      ) : groups.map((group) => (
        <div key={group.day}>
          <h3 className="bg-slate-50 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {group.day === today ? 'Hoy · ' : ''}{formatYmd(group.day, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <ul className="divide-y divide-slate-100">
            {group.items.map((appointment) => {
              const TypeIcon = TYPE_ICONS[appointment.type] ?? Video;
              const open = isOpenAppointment(appointment);
              return (
                <li key={appointment._id} className="flex flex-col justify-between gap-4 px-6 py-4 hover:bg-slate-50 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-center text-lg font-bold text-slate-900">{formatTime(appointment.date)}</div>
                    <div>
                      <button type="button" onClick={() => onOpenPatient(appointment.patientId)} className="text-left font-bold text-slate-900 hover:text-purple-700">{appointment.patientName}</button>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><TypeIcon className="h-4 w-4" /> {appointment.type}</span>
                        <StatusBadge status={appointment.status} />
                      </div>
                      {appointment.patientNotes && <p className="mt-1 text-xs text-slate-500">📝 {appointment.patientNotes}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {open && (
                      <button type="button" onClick={() => onOpenConsultation(appointment)} className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800">
                        <BookOpen className="h-4 w-4" /> Iniciar consulta
                      </button>
                    )}
                    {appointment.status === 'COMPLETED' && (
                      <button type="button" onClick={() => onOpenConsultation(appointment)} className={`${secondaryButton} text-sm`}>
                        <Eye className="h-4 w-4" /> Ver consulta
                      </button>
                    )}
                    {appointment.status === 'PENDING' && (
                      <button type="button" onClick={() => changeStatus(appointment, 'CONFIRMED')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                        <Check className="h-4 w-4" /> Confirmar
                      </button>
                    )}
                    {open && (
                      <button type="button" onClick={() => changeStatus(appointment, 'CANCELLED')} title={appointment.status === 'PENDING' ? 'Rechazar' : 'Cancelar'} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                        <XCircle className="h-4 w-4" /> {appointment.status === 'PENDING' ? 'Rechazar' : 'Cancelar'}
                      </button>
                    )}
                    <button type="button" onClick={() => onOpenPatient(appointment.patientId)} title="Ficha del paciente" className={`${secondaryButton} px-3 py-2 text-sm`}>
                      <User className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </Card>
  );
}
