'use client';

import { useEffect, useState } from 'react';
import { Leaf, Calendar as CalendarIcon, User, FileText, Clock, UserCog, LogOut, Menu, X } from 'lucide-react';
import fotoMichelle from '../../assets/foto-michelle.jpeg';
import { authenticatedRequest } from '../../lib/api';
import { Card } from '../ui';
import AgendaSection from './AgendaSection';
import PatientsSection from './PatientsSection';
import PatientDetail from './PatientDetail';
import FilesSection from './FilesSection';
import ScheduleSection from './ScheduleSection';
import ConsultationRoom from './ConsultationRoom';
import ProfileForm from '../ProfileForm';

const SECTIONS = [
  ['agenda', 'Agenda', CalendarIcon],
  ['patients', 'Pacientes', User],
  ['files', 'Pautas y archivos', FileText],
  ['schedule', 'Horario', Clock],
  ['profile', 'Mi perfil', UserCog],
];

const SUBTITLES = {
  agenda: 'Tus próximas consultas y solicitudes por confirmar.',
  patients: 'Fichas, historial y evolución de tus pacientes.',
  files: 'Material que entregas en las consultas.',
  schedule: 'Días, horas y feriados disponibles para agendar.',
  profile: 'Tus datos de acceso.',
};

export default function AdminDashboard({ user, onUserUpdated, onLogout }) {
  const [section, setSection] = useState('agenda');
  const [patientId, setPatientId] = useState(null);
  const [consultationAppointment, setConsultationAppointment] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  async function loadAppointments() {
    try {
      setAppointmentsError('');
      setAppointments(await authenticatedRequest('/appointments'));
    } catch (loadError) {
      setAppointmentsError(loadError.message);
    }
  }

  // La agenda se carga al entrar y se refresca cada minuto mientras el panel está abierto
  useEffect(() => {
    loadAppointments();
    const timer = setInterval(loadAppointments, 60_000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (key) => {
    setSection(key);
    setPatientId(null);
    setMenuOpen(false);
  };

  const openPatient = (id) => {
    setConsultationAppointment(null);
    setSection('patients');
    setPatientId(id);
  };

  if (consultationAppointment) {
    return (
      <ConsultationRoom
        appointment={consultationAppointment}
        onBack={() => { setConsultationAppointment(null); loadAppointments(); }}
        onOpenPatient={(id) => { loadAppointments(); openPatient(id); }}
      />
    );
  }

  const pendingCount = (appointments ?? []).filter((item) => item.status === 'PENDING').length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <aside className="bg-slate-900 text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:p-6">
        <div className="flex items-center justify-between p-4 md:mb-10 md:p-0">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-400" />
            <span className="font-serif text-xl font-bold">Portal Nutri</span>
          </div>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú" className="md:hidden">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        <nav className={`${menuOpen ? 'block' : 'hidden'} space-y-1 px-4 pb-4 md:block md:flex-1 md:px-0`}>
          {SECTIONS.map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => goTo(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium ${section === key ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Icon className="h-5 w-5" /> {label}
              {key === 'agenda' && pendingCount > 0 && <span className="ml-auto rounded-full bg-amber-400 px-2 text-xs font-bold text-slate-900">{pendingCount}</span>}
            </button>
          ))}
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 transition-colors hover:text-red-400 md:hidden">
            <LogOut className="h-5 w-5" /> Cerrar sesión
          </button>
        </nav>
        <button type="button" onClick={onLogout} className="mt-auto hidden items-center gap-3 px-4 py-3 text-slate-400 transition-colors hover:text-red-400 md:flex">
          <LogOut className="h-5 w-5" /> Cerrar sesión
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        {!patientId && (
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900">Hola, {user.name.split(' ')[0]} 👋</h1>
              <p className="mt-1 text-slate-500">{SUBTITLES[section]}</p>
            </div>
            <img src={fotoMichelle.src} alt="" className="hidden h-12 w-12 rounded-full border-2 border-white object-cover shadow sm:block" />
          </div>
        )}

        {section === 'agenda' && (
          <AgendaSection
            appointments={appointments}
            error={appointmentsError}
            onReload={loadAppointments}
            onOpenConsultation={setConsultationAppointment}
            onOpenPatient={openPatient}
          />
        )}
        {section === 'patients' && !patientId && <PatientsSection onOpenPatient={setPatientId} />}
        {section === 'patients' && patientId && (
          <PatientDetail
            key={patientId}
            patientId={patientId}
            onBack={() => setPatientId(null)}
            onOpenConsultation={setConsultationAppointment}
          />
        )}
        {section === 'files' && <FilesSection />}
        {section === 'schedule' && <ScheduleSection />}
        {section === 'profile' && (
          <Card title="Mi perfil"><ProfileForm user={user} onUpdated={onUserUpdated} /></Card>
        )}
      </main>
    </div>
  );
}
