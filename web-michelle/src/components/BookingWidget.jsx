'use client';

import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Video, Home, CheckCircle2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { apiRequest, authenticatedRequest, jsonBody } from '../lib/api';
import { formatDateTime, formatYmd } from '../lib/format';
import { Alert, Spinner, inputClass, primaryButton } from './ui';

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const MODALITIES = [
  ['Presencial', Home, 'En la consulta'],
  ['Domicilio', MapPin, 'Voy a tu hogar'],
  ['Online', Video, 'Videollamada'],
];

/**
 * Selector de día, hora y modalidad sobre la disponibilidad real del backend.
 * Con patientId (modo admin) agenda a nombre de ese paciente.
 */
export default function BookingWidget({ patientId, onBooked }) {
  const [days, setDays] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [type, setType] = useState('Presencial');
  const [notes, setNotes] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [challengeVersion, setChallengeVersion] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  async function loadAvailability() {
    try {
      setLoadError('');
      const result = await apiRequest('/schedule/availability');
      setDays(result);
      // Si el bloque elegido se ocupó mientras tanto, se deselecciona
      setSelectedDay((current) => (current ? result.find((day) => day.date === current.date) ?? null : null));
      setSelectedSlot((current) => {
        if (!current) return null;
        const fresh = result.flatMap((day) => day.slots).find((slot) => slot.iso === current.iso);
        return fresh?.available ? fresh : null;
      });
    } catch (availabilityError) {
      setLoadError(availabilityError.message);
    }
  }

  useEffect(() => {
    loadAvailability();
  }, []);

  const submit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      const appointment = await authenticatedRequest('/appointments', {
        method: 'POST',
        body: jsonBody({
          date: selectedSlot.iso,
          type,
          patientId,
          patientNotes: notes.trim() || undefined,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      setBooked(appointment);
      setSelectedSlot(null);
      setNotes('');
      onBooked?.(appointment);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
      setTurnstileToken('');
      setChallengeVersion((version) => version + 1);
      loadAvailability();
    }
  };

  if (booked) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">{patientId ? '¡Hora agendada!' : '¡Hora solicitada!'}</h3>
        <p className="text-slate-600">{formatDateTime(booked.date)} · {booked.type}</p>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          {patientId ? 'La hora quedó confirmada y aparece en la agenda.' : 'Michelle revisará tu solicitud. Puedes seguir su estado en Mis horas.'}
        </p>
        <button type="button" onClick={() => setBooked(null)} className="rounded-full bg-slate-800 px-6 py-2.5 font-medium text-white hover:bg-slate-900">
          Agendar otra hora
        </button>
      </div>
    );
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!days) return <Spinner label="Cargando horarios disponibles..." />;
  if (!days.length) return <p className="text-sm text-slate-500">No hay horarios disponibles por ahora. Vuelve a revisar en unos días.</p>;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h4 className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarIcon className="h-5 w-5 text-purple-700" /> Elige un día</h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {days.map((day) => {
            const free = day.slots.filter((slot) => slot.available).length;
            const active = selectedDay?.date === day.date;
            return (
              <button
                key={day.date}
                type="button"
                disabled={!free}
                onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
                className={`rounded-xl border p-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-purple-700 bg-purple-50 text-purple-900 ring-2 ring-purple-200' : 'border-slate-200 text-slate-700 hover:border-purple-300'}`}
              >
                <div className="text-xs uppercase text-slate-500">{formatYmd(day.date, { weekday: 'short' })}</div>
                <div className="text-2xl font-bold">{formatYmd(day.date, { day: 'numeric' })}</div>
                <div className="text-xs text-slate-500">{free ? formatYmd(day.date, { month: 'short' }) : 'Lleno'}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-4 flex items-center gap-2 text-lg font-bold"><Clock className="h-5 w-5 text-purple-700" /> Elige hora <span className="text-xs font-normal text-slate-500">(hora de Chile)</span></h4>
        {selectedDay ? (
          <div className="grid grid-cols-2 gap-2">
            {selectedDay.slots.map((slot) => (
              <button
                key={slot.iso}
                type="button"
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-xl border p-3 text-center font-medium transition-all ${selectedSlot?.iso === slot.iso ? 'border-purple-700 bg-purple-700 text-white' : slot.available ? 'border-slate-200 text-slate-700 hover:border-purple-700' : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'}`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-400">Selecciona un día primero</p>
          </div>
        )}
      </div>

      <div className="md:col-span-2">
        <h4 className="mb-4 flex items-center gap-2 text-lg font-bold"><MapPin className="h-5 w-5 text-purple-700" /> Modalidad</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODALITIES.map(([value, Icon, description]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${type === value ? 'border-purple-700 bg-purple-700 text-white' : 'border-slate-200 text-slate-700 hover:border-purple-700'}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-medium">{value === 'Presencial' ? 'Consulta' : value}</span>
                <span className={`block text-xs ${type === value ? 'text-purple-100' : 'text-slate-500'}`}>{description}</span>
              </span>
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={300}
          placeholder={type === 'Domicilio' ? 'Dirección para la atención a domicilio' : 'Comentario para Michelle (opcional)'}
          required={type === 'Domicilio'}
          className={`${inputClass} mt-3`}
        />
      </div>

      <div className="flex flex-col items-stretch gap-3 border-t border-slate-100 pt-6 md:col-span-2 md:items-end">
        <Alert>{error}</Alert>
        {turnstileSiteKey && !patientId && (
          <Turnstile key={challengeVersion} siteKey={turnstileSiteKey} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken('')} onError={() => setTurnstileToken('')} />
        )}
        {selectedSlot && (
          <p className="text-sm text-slate-600">
            {formatYmd(selectedDay.date, { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedSlot.time} · {type}
          </p>
        )}
        <button
          type="button"
          disabled={!selectedSlot || submitting || Boolean(turnstileSiteKey && !patientId && !turnstileToken) || (type === 'Domicilio' && !notes.trim())}
          onClick={submit}
          className={`${primaryButton} rounded-full px-8 py-3`}
        >
          {submitting ? 'Agendando...' : patientId ? 'Agendar hora' : 'Solicitar hora'}
        </button>
      </div>
    </div>
  );
}
