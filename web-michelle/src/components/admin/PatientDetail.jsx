'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, CalendarPlus, Download, Send, Eye, BookOpen, Mail, Phone } from 'lucide-react';
import { authenticatedRequest, downloadFile, jsonBody } from '../../lib/api';
import { formatDate, formatDateTime, isOpenAppointment } from '../../lib/format';
import { Alert, Card, EmptyState, Field, Modal, Spinner, StatusBadge, inputClass, primaryButton, secondaryButton } from '../ui';
import BookingWidget from '../BookingWidget';
import FileUploader from './FileUploader';

function Trend({ values, unit }) {
  const numbers = values.filter((value) => typeof value === 'number');
  if (numbers.length < 2) return null;
  const diff = numbers.at(-1) - numbers[0];
  if (!diff) return <span className="text-xs text-slate-400">sin cambio</span>;
  return (
    <span className={`text-xs font-medium ${diff < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
      {diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit} desde la primera consulta
    </span>
  );
}

export default function PatientDetail({ patientId, onBack, onOpenConsultation }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(false);

  async function load() {
    try {
      setError('');
      const result = await authenticatedRequest(`/patients/${patientId}`);
      setData(result);
      setForm({ name: result.patient.name, phone: result.patient.phone ?? '', adminNotes: result.patient.adminNotes ?? '' });
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    load();
  }, [patientId]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await authenticatedRequest(`/patients/${patientId}`, { method: 'PATCH', body: jsonBody(form) });
      setNotice('Datos del paciente guardados.');
      load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const run = async (action, successMessage) => {
    setError('');
    setNotice('');
    try {
      const result = await action();
      if (successMessage) setNotice(typeof successMessage === 'function' ? successMessage(result) : successMessage);
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  const resend = (consultation) => run(
    () => authenticatedRequest(`/consultations/${consultation._id}/send`, { method: 'POST' }),
    (result) => (result.emailSent ? 'Pauta reenviada por correo.' : 'No se pudo enviar el correo (revisa la configuración de correo). Puedes descargar el PDF y enviarlo manualmente.'),
  );

  if (!data) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ChevronLeft className="h-4 w-4" /> Volver</button>
        {error ? <Alert>{error}</Alert> : <Spinner />}
      </div>
    );
  }

  const { patient, appointments, consultations, files } = data;
  const closed = consultations.filter((item) => item.closed);
  const chronological = [...closed].reverse();
  const appointmentById = new Map(appointments.map((item) => [item._id, item]));

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ChevronLeft className="h-4 w-4" /> Volver</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">{patient.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <a href={`mailto:${patient.email}`} className="flex items-center gap-1 hover:text-purple-700"><Mail className="h-4 w-4" /> {patient.email}</a>
            {patient.phone && <a href={`tel:${patient.phone}`} className="flex items-center gap-1 hover:text-purple-700"><Phone className="h-4 w-4" /> {patient.phone}</a>}
            <span>Paciente desde {formatDate(patient.createdAt)}</span>
          </p>
        </div>
        <button type="button" onClick={() => setBooking(true)} className={primaryButton}><CalendarPlus className="h-4 w-4" /> Agendar hora</button>
      </div>

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

      {booking && (
        <Modal title={`Agendar hora para ${patient.name}`} onClose={() => setBooking(false)} wide>
          <BookingWidget patientId={patientId} onBooked={() => load()} />
        </Modal>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Evolución">
            {closed.length === 0 ? <EmptyState>Aún no hay consultas finalizadas.</EmptyState> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr><th className="px-6 py-2">Fecha</th><th className="px-3 py-2">Peso (kg)</th><th className="px-3 py-2">% Grasa</th><th className="px-3 py-2">M. muscular</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closed.map((item) => (
                      <tr key={item._id}>
                        <td className="px-6 py-2 text-slate-700">{formatDate(item.appointmentDate ?? item.closedAt)}</td>
                        <td className="px-3 py-2">{item.weight ?? '—'}</td>
                        <td className="px-3 py-2">{item.bodyFat ?? '—'}</td>
                        <td className="px-3 py-2">{item.muscleMass ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-4 px-6 py-3">
                  <Trend values={chronological.map((item) => item.weight)} unit="kg" />
                  <Trend values={chronological.map((item) => item.bodyFat)} unit="% grasa" />
                </div>
              </div>
            )}
          </Card>

          <Card title="Consultas">
            {consultations.length === 0 ? <EmptyState>Sin consultas registradas.</EmptyState> : (
              <ul className="divide-y divide-slate-100">
                {consultations.map((item) => {
                  const appointment = appointmentById.get(item.appointmentId);
                  return (
                    <li key={item._id} className="space-y-2 px-6 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {formatDateTime(item.appointmentDate ?? item.createdAt)}{' '}
                          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${item.closed ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'}`}>{item.closed ? 'Finalizada' : 'Borrador'}</span>
                          {item.closed && <span className="ml-1 text-xs font-normal text-slate-500">{item.emailSentAt ? '· pauta enviada' : '· pauta sin enviar'}</span>}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {appointment && (
                            <button type="button" onClick={() => onOpenConsultation(appointment)} className={`${secondaryButton} px-3 py-1.5 text-sm`}>
                              {item.closed ? <><Eye className="h-4 w-4" /> Ver</> : <><BookOpen className="h-4 w-4" /> Continuar</>}
                            </button>
                          )}
                          {item.closed && (
                            <>
                              <button type="button" onClick={() => run(() => downloadFile(`/consultations/${item._id}/pdf`, 'pauta.pdf'))} className={`${secondaryButton} px-3 py-1.5 text-sm`}><Download className="h-4 w-4" /> PDF</button>
                              <button type="button" onClick={() => resend(item)} className={`${secondaryButton} px-3 py-1.5 text-sm`}><Send className="h-4 w-4" /> Reenviar</button>
                            </>
                          )}
                        </div>
                      </div>
                      {item.notes && <p className="whitespace-pre-line text-sm text-slate-600"><strong className="text-slate-800">Anamnesis:</strong> {item.notes}</p>}
                      {item.actionPlan && <p className="whitespace-pre-line text-sm text-slate-600"><strong className="text-slate-800">Indicaciones:</strong> {item.actionPlan}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Horas">
            {appointments.length === 0 ? <EmptyState>Sin horas agendadas.</EmptyState> : (
              <ul className="divide-y divide-slate-100">
                {appointments.map((appointment) => (
                  <li key={appointment._id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{formatDateTime(appointment.date)}</p>
                      <p className="text-xs text-slate-500">{appointment.type}{appointment.cancelReason ? ` · Motivo: ${appointment.cancelReason}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={appointment.status} />
                      {isOpenAppointment(appointment) && (
                        <button type="button" onClick={() => onOpenConsultation(appointment)} className="text-sm font-medium text-purple-700 hover:text-purple-900">Atender</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Datos">
            <form onSubmit={save} className="space-y-3 p-6">
              <Field label="Nombre"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} className={inputClass} /></Field>
              <Field label="Teléfono"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} /></Field>
              <Field label="Notas internas" hint="Solo las ves tú."><textarea rows={4} value={form.adminNotes} onChange={(event) => setForm({ ...form, adminNotes: event.target.value })} className={inputClass} /></Field>
              <p className="text-xs text-slate-500">{patient.consentAt ? `Aceptó el aviso de privacidad el ${formatDate(patient.consentAt)}.` : 'Creado desde el panel: aún no acepta el aviso de privacidad en línea.'}</p>
              <button disabled={saving} className={`${primaryButton} w-full`}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </form>
          </Card>

          <Card title="Archivos del paciente">
            <div className="p-6">
              <FileUploader patientId={patientId} onUploaded={load} />
            </div>
            {files.length === 0 ? <EmptyState>Sin archivos propios. Puedes adjuntar pautas de la biblioteca en cada consulta.</EmptyState> : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {files.map((file) => (
                  <li key={file._id} className="flex items-center justify-between gap-2 px-6 py-3 text-sm">
                    <span className="truncate">{file.name}</span>
                    <button type="button" onClick={() => run(() => downloadFile(`/files/${file._id}/download`, file.name))} className="text-purple-700 hover:text-purple-900" title="Descargar"><Download className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
