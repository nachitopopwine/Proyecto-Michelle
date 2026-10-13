'use client';

import { useEffect, useState } from 'react';
import { Download, Trash2, FileText } from 'lucide-react';
import { authenticatedRequest, downloadFile } from '../../lib/api';
import { formatDate, formatSize } from '../../lib/format';
import { Alert, Card, EmptyState, Spinner } from '../ui';
import FileUploader from './FileUploader';

export default function FilesSection() {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const result = await authenticatedRequest('/files');
      setFiles(result.filter((file) => !file.patientId));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const remove = async (file) => {
    if (!window.confirm(`¿Eliminar "${file.name}" de la biblioteca?`)) return;
    try {
      await authenticatedRequest(`/files/${file._id}`, { method: 'DELETE' });
      load();
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  const download = async (file) => {
    try {
      await downloadFile(`/files/${file._id}/download`, file.name);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Biblioteca de pautas" className="lg:col-span-2">
        <p className="px-6 pt-4 text-sm text-slate-500">
          Minutas, guías de porciones y material de apoyo. Puedes adjuntarlos a cualquier consulta y se envían por correo junto con la pauta PDF.
        </p>
        <div className="px-6 pt-4"><Alert onClose={() => setError('')}>{error}</Alert></div>
        {!files && !error ? <Spinner /> : files?.length === 0 ? <EmptyState>La biblioteca está vacía. Sube tu primera pauta.</EmptyState> : (
          <ul className="mt-2 divide-y divide-slate-100">
            {(files ?? []).map((file) => (
              <li key={file._id} className="flex items-center gap-3 px-6 py-3">
                <FileText className="h-5 w-5 shrink-0 text-purple-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatSize(file.size)} · {formatDate(file.createdAt)}</p>
                </div>
                <button type="button" onClick={() => download(file)} title="Descargar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-purple-700"><Download className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(file)} title="Eliminar" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Subir a la biblioteca">
        <div className="p-6"><FileUploader onUploaded={load} /></div>
      </Card>
    </div>
  );
}
