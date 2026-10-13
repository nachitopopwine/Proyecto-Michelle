'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { authenticatedRequest, jsonBody } from '../../lib/api';
import { WEEKDAYS, formatYmd, todayYmd } from '../../lib/format';
import { Alert, Card, Field, Spinner, inputClass, primaryButton, secondaryButton } from '../ui';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function ScheduleSection() {
  const [settings, setSettings] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [newHoliday, setNewHoliday] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authenticatedRequest('/schedule/settings').then(setSettings).catch((loadError) => setError(loadError.message));
  }, []);

  const toggleDay = (day) => setSettings((current) => ({
    ...current,
    workingDays: current.workingDays.includes(day)
      ? current.workingDays.filter((item) => item !== day)
      : [...current.workingDays, day],
  }));

  const addTime = () => {
    if (!newTime || settings.slotTimes.includes(newTime)) return;
    setSettings((current) => ({ ...current, slotTimes: [...current.slotTimes, newTime].sort() }));
    setNewTime('');
  };

  const addHoliday = () => {
    if (!newHoliday || settings.holidays.includes(newHoliday)) return;
    setSettings((current) => ({ ...current, holidays: [...current.holidays, newHoliday].sort() }));
    setNewHoliday('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await authenticatedRequest('/schedule/settings', {
        method: 'PUT',
        body: jsonBody({
          workingDays: settings.workingDays,
          slotTimes: settings.slotTimes,
          durationMinutes: Number(settings.durationMinutes),
          holidays: settings.holidays,
          bookingWindowDays: Number(settings.bookingWindowDays),
        }),
      });
      setSettings(saved);
      setNotice('Horario guardado. Los pacientes ya ven la nueva disponibilidad (las horas ya agendadas no cambian).');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return error ? <Alert>{error}</Alert> : <Spinner />;

  const today = todayYmd();

  return (
    <Card title="Horario de atención">
      <div className="space-y-8 p-6">
        <p className="text-sm text-slate-500">Todas las horas están en horario de Chile (America/Santiago).</p>

        <div>
          <h3 className="mb-3 font-semibold text-slate-800">Días de atención</h3>
          <div className="flex flex-wrap gap-2">
            {WEEK_ORDER.map((day) => (
              <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-full px-4 py-2 text-sm font-medium ${settings.workingDays.includes(day) ? 'bg-purple-700 text-white' : 'border border-slate-200 text-slate-600 hover:border-purple-300'}`}>
                {WEEKDAYS[day]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-slate-800">Horas de inicio de cada consulta</h3>
          <div className="flex flex-wrap gap-2">
            {settings.slotTimes.map((time) => (
              <span key={time} className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-800">
                {time}
                <button type="button" onClick={() => setSettings({ ...settings, slotTimes: settings.slotTimes.filter((item) => item !== time) })} aria-label={`Quitar ${time}`} className="text-purple-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} className={`${inputClass} w-36`} />
            <button type="button" onClick={addTime} className={secondaryButton}><Plus className="h-4 w-4" /> Agregar</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duración de cada consulta (minutos)" hint="Se usa para el evento en Google Calendar.">
            <input type="number" min={15} max={240} value={settings.durationMinutes} onChange={(event) => setSettings({ ...settings, durationMinutes: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Se puede agendar hasta (días hacia adelante)">
            <input type="number" min={1} max={120} value={settings.bookingWindowDays} onChange={(event) => setSettings({ ...settings, bookingWindowDays: event.target.value })} className={inputClass} />
          </Field>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-slate-800">Feriados y días bloqueados</h3>
          <div className="flex flex-wrap gap-2">
            {settings.holidays.length === 0 && <span className="text-sm text-slate-500">Ninguno.</span>}
            {settings.holidays.map((day) => (
              <span key={day} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${day < today ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-800'}`}>
                {formatYmd(day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                <button type="button" onClick={() => setSettings({ ...settings, holidays: settings.holidays.filter((item) => item !== day) })} aria-label="Quitar feriado" className="opacity-60 hover:text-red-600 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input type="date" min={today} value={newHoliday} onChange={(event) => setNewHoliday(event.target.value)} className={`${inputClass} w-48`} />
            <button type="button" onClick={addHoliday} className={secondaryButton}><Plus className="h-4 w-4" /> Bloquear día</button>
          </div>
        </div>

        <Alert onClose={() => setError('')}>{error}</Alert>
        <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
        <button type="button" disabled={saving || !settings.workingDays.length || !settings.slotTimes.length} onClick={save} className={primaryButton}>
          {saving ? 'Guardando...' : 'Guardar horario'}
        </button>
      </div>
    </Card>
  );
}
