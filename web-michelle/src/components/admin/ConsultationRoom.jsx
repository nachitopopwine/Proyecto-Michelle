'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, BookOpen, FileText, Send, Save, Download, Lock, History } from 'lucide-react';
import { authenticatedRequest, downloadFile, jsonBody } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { Alert, Card, Field, Spinner, StatusBadge, inputClass, primaryButton, secondaryButton } from '../ui';

const EMPTY_FORM = { notes: '', weight: '', bodyFat: '', muscleMass: '', actionPlan: '', attachmentIds: [] };

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : undefined;
}

/**
 * Sala de consulta: registra la ficha (con borrador), adjunta pautas y al finalizar
 * cierra la consulta, completa la cita y envía la pauta PDF al paciente.
 */
export default function ConsultationRoom({ appointment, onBack, onOpenPatient }) {
  const [consultation, setConsultation] = useState(undefined);
  const [form, setForm] = useState(EMPTY_FORM);
  const [library, setLibrary] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      authenticatedRequest(`/consultations?appointmentId=${appointment._id}`),
      authenticatedRequest(`/files?patientId=${appointment.patientId}`),
      authenticatedRequest(`/patients/${appointment.patientId}`),
    ])
      .then(([existing, files, patient]) => {
        if (!active) return;
        setConsultation(existing);
        if (existing) {
          setForm({
            notes: existing.notes ?? '',
            weight: existing.weight ?? '',
            bodyFat: existing.bodyFat ?? '',
            muscleMass: existing.muscleMass ?? '',
            actionPlan: existing.actionPlan ?? '',
            attachmentIds: existing.attachmentIds ?? [],
          });
        }
        setLibrary(files);
        setHistory(patient.consultations.filter((item) => item.closed && item.appointmentId !== appointment._id));
      })
      .catch((loadError) => active && setError(loadError.message));
    return () => { active = false; };
  }, [appointment._id, appointment.patientId]);

  const closed = Boolean(consultation?.closed) || appointment.status === 'COMPLETED';
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const toggleAttachment = (id) => setForm((current) => ({
    ...current,
    attachmentIds: current.attachmentIds.includes(id)
      ? current.attachmentIds.filter((item) => item !== id)
      : [...current.attachmentIds, id],
  }));

  const submit = async (finalize) => {
    if (finalize && !window.confirm('¿Finalizar la consulta? Se cerrará la ficha (ya no se podrá editar), la cita quedará como realizada y se enviará la pauta al paciente.')) return;
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const response = await authenticatedRequest('/consultations', {
        method: 'POST',
        body: jsonBody({
          appointmentId: appointment._id,
          notes: form.notes,
          actionPlan: form.actionPlan,
          weight: toNumber(form.weight),
          bodyFat: toNumber(form.bodyFat),
          muscleMass: toNumber(form.muscleMass),
          attachmentIds: form.attachmentIds,
          finalize,
        }),
      });
      setConsultation(response.consultation);
      setResult({ finalize, ...response });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    try {
      await downloadFile(`/consultations/${consultation._id}/pdf`, 'pauta.pdf');
    } catch (downloadError) {
      setError(downloadError.message);
    }
  };

  const resultMessage = result && (
    !result.finalize
      ? { type: 'success', text: 'Borrador guardado. Puedes continuar más tarde.' }
      : result.emailSent
        ? { type: 'success', text: `Consulta finalizada. La pauta PDF fue enviada a ${appointment.patientEmail}.` }
        : {
            type: 'info',
            text: result.mailEnabled
              ? 'Consulta finalizada, pero el correo no se pudo enviar. Descarga el PDF o usa “Reenviar” desde la ficha del paciente.'
              : 'Consulta finalizada. El envío de correos no está configurado: descarga el PDF para entregarlo. El paciente también puede descargarlo desde su cuenta.',
          }
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-8">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Volver" className="text-slate-400 hover:text-slate-700"><ChevronLeft className="h-6 w-6" /></button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {closed ? 'Consulta' : 'Consulta en curso'}:{' '}
              <button type="button" onClick={() => onOpenPatient(appointment.patientId)} className="hover:text-purple-700">{appointment.patientName}</button>
            </h2>
            <p className="flex items-center gap-2 text-sm text-slate-500">{formatDateTime(appointment.date)} · {appointment.type} <StatusBadge status={closed ? 'COMPLETED' : appointment.status} /></p>
          </div>
        </div>
        {consultation !== undefined && !closed && (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => submit(false)} className={secondaryButton}><Save className="h-4 w-4" /> Guardar borrador</button>
            <button type="button" disabled={saving} onClick={() => submit(true)} className={`${primaryButton} bg-emerald-600 hover:bg-emerald-700`}>
              <Send className="h-4 w-4" /> {saving ? 'Guardando...' : 'Finalizar y enviar pauta'}
            </button>
          </div>
        )}
        {closed && consultation && (
          <button type="button" onClick={downloadPdf} className={secondaryButton}><Download className="h-4 w-4" /> Descargar pauta PDF</button>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 p-4 sm:p-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Alert onClose={() => setError('')}>{error}</Alert>
          {resultMessage && <Alert type={resultMessage.type} onClose={() => setResult(null)}>{resultMessage.text}</Alert>}
          {closed && (
            <Alert type="info"><span className="inline-flex items-center gap-1"><Lock className="h-4 w-4" /> Consulta finalizada{consultation?.closedAt ? ` el ${formatDate(consultation.closedAt)}` : ''}. La ficha ya no se puede modificar.</span></Alert>
          )}

          {consultation === undefined && !error ? <Spinner /> : (
            <Card>
              <div className="space-y-4 p-6 sm:p-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><BookOpen className="h-5 w-5 text-purple-600" /> Registro clínico</h3>
                <Field label="Motivo de consulta / Anamnesis" hint="Solo la ves tú; no se incluye en la pauta del paciente.">
                  <textarea rows={4} value={form.notes} onChange={update('notes')} disabled={closed} className={inputClass} placeholder="Observaciones de la sesión..." />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Peso (kg)"><input type="number" step="0.1" min="1" max="400" value={form.weight} onChange={update('weight')} disabled={closed} className={inputClass} /></Field>
                  <Field label="% Grasa"><input type="number" step="0.1" min="0" max="100" value={form.bodyFat} onChange={update('bodyFat')} disabled={closed} className={inputClass} /></Field>
                  <Field label="Masa muscular (kg)"><input type="number" step="0.1" min="0" max="200" value={form.muscleMass} onChange={update('muscleMass')} disabled={closed} className={inputClass} /></Field>
                </div>
                <Field label="Plan de acción / Indicaciones" hint="Esto va en la pauta PDF que recibe el paciente.">
                  <textarea rows={8} value={form.actionPlan} onChange={update('actionPlan')} disabled={closed} className={inputClass} placeholder="1. Aumentar consumo de agua..." />
                </Field>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-purple-100 bg-purple-50 p-6">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-purple-900"><FileText className="h-5 w-5" /> Adjuntos para el paciente</h3>
            <p className="mb-4 text-sm text-purple-700">Se envían por correo junto con la pauta PDF al finalizar.</p>
            {library.length === 0 ? (
              <p className="text-sm text-purple-700">No hay archivos. Súbelos en “Pautas y archivos”.</p>
            ) : (
              <div className="space-y-2">
                {library.map((file) => (
                  <label key={file._id} className={`flex items-center gap-3 rounded-xl border border-purple-200 bg-white p-3 ${closed ? '' : 'cursor-pointer hover:bg-purple-100'}`}>
                    <input type="checkbox" checked={form.attachmentIds.includes(file._id)} onChange={() => toggleAttachment(file._id)} disabled={closed} className="h-4 w-4 rounded border-slate-300 text-purple-600" />
                    <span className="text-sm font-medium text-slate-700">{file.name}{file.patientId ? ' (del paciente)' : ''}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <Card title={<span className="flex items-center gap-2"><History className="h-5 w-5 text-slate-500" /> Consultas anteriores</span>}>
            {history.length === 0 ? <p className="p-6 text-sm text-slate-500">Primera consulta del paciente.</p> : (
              <ul className="divide-y divide-slate-100">
                {history.slice(0, 5).map((item) => (
                  <li key={item._id} className="space-y-1 px-6 py-4 text-sm">
                    <p className="font-semibold text-slate-800">{formatDate(item.appointmentDate ?? item.closedAt)}</p>
                    <p className="text-slate-600">
                      {[item.weight && `${item.weight} kg`, item.bodyFat && `${item.bodyFat}% grasa`, item.muscleMass && `${item.muscleMass} kg músculo`].filter(Boolean).join(' · ') || 'Sin mediciones'}
                    </p>
                    {item.actionPlan && <p className="line-clamp-3 whitespace-pre-line text-slate-500">{item.actionPlan}</p>}
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
