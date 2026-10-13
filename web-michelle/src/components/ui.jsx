'use client';

import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { STATUS_LABELS, STATUS_STYLES } from '../lib/format';

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? ''}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Alert({ type = 'error', children, onClose }) {
  if (!children) return null;
  const styles = type === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : type === 'info'
      ? 'bg-sky-50 border-sky-200 text-sky-800'
      : 'bg-red-50 border-red-200 text-red-700';
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = 'Cargando...' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 p-6">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl`}>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 rounded-full bg-slate-100 p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
          <X className="h-5 w-5" />
        </button>
        {title && <h2 className="mb-6 pr-8 text-2xl font-serif font-bold text-slate-900">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-50 disabled:text-slate-500';

export const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-2.5 font-medium text-white transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-slate-300';

export const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          {title && <h2 className="text-lg font-bold text-slate-800">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }) {
  return <p className="p-6 text-sm text-slate-500">{children}</p>;
}
