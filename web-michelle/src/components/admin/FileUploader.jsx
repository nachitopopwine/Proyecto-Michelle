'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { authenticatedRequest } from '../../lib/api';
import { Alert, inputClass, primaryButton } from '../ui';

const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

/** Sube un PDF/Word a la biblioteca general o, con patientId, a la ficha de un paciente. */
export default function FileUploader({ patientId, onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    if (name.trim()) body.append('name', name.trim());
    if (patientId) body.append('patientId', patientId);
    try {
      const uploaded = await authenticatedRequest('/files', { method: 'POST', body });
      setFile(null);
      setName('');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded?.(uploaded);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected && !name) setName(selected.name); }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:font-medium file:text-purple-700 hover:file:bg-purple-100"
      />
      {file && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre visible del archivo" className={inputClass} />}
      <Alert>{error}</Alert>
      <button disabled={!file || uploading} className={`${primaryButton} w-full`}>
        <Upload className="h-4 w-4" /> {uploading ? 'Subiendo...' : 'Subir archivo'}
      </button>
      <p className="text-xs text-slate-500">PDF, Word, JPG o PNG. Máximo 8 MB.</p>
    </form>
  );
}
