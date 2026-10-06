'use client';

import { useState } from 'react';
import { 
  Heart, Leaf, Calendar as CalendarIcon, CheckCircle2, Clock, MapPin, Video, Home, ChevronRight, 
  Info, Menu, X, BookOpen, User, Lock, LogOut, FileText, Send, XCircle, Search, Mail, ChevronLeft
} from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

// Importación de la imagen con la ruta correcta
import fotoMichelle from './assets/foto-michelle.jpeg'; 
import { authenticatedRequest, apiRequest } from './lib/api';

export default function NutricionistaSystem() {
  // Estados de la aplicación
  const [currentUser, setCurrentUser] = useState(() => (
    typeof window === 'undefined' ? null : window.localStorage.getItem('userRole')
  )); // null, 'patient', 'admin'
  const [currentView, setCurrentView] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('userRole') === 'admin'
      ? 'admin_dashboard'
      : 'landing'
  )); // landing, admin_dashboard, consultation
  const [showLoginModal, setShowLoginModal] = useState(false); // Estado para el modal de login
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [authTurnstileToken, setAuthTurnstileToken] = useState('');
  const [bookingTurnstileToken, setBookingTurnstileToken] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [consultationForm, setConsultationForm] = useState({
    notes: '', weight: '', bodyFat: '', muscleMass: '', actionPlan: '',
  });
  const [consultationError, setConsultationError] = useState('');
  const [adminSection, setAdminSection] = useState('agenda');
  
  // Estados del agendamiento
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [activePatient, setActivePatient] = useState(null);

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) days.push(date);
    }
    return days.slice(0, 8); 
  };
  const availableDays = getNextDays();
  const timeSlots = ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00'];
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function loadAppointments() {
    const token = window.localStorage.getItem('accessToken');
    if (!token) return;

    try {
      setAppointmentsError('');
      const result = await authenticatedRequest('/appointments', token);
      setAppointments(result);
    } catch (error) {
      setAppointmentsError(error.message);
    }
  }

  // Navegación
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);

    try {
      const response = await apiRequest(`/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify({ ...authForm, turnstileToken: authTurnstileToken || undefined }),
      });

      if (authMode === 'register') {
        setAuthMode('login');
        setAuthForm({ email: authForm.email, password: '', name: '' });
        setAuthError('Cuenta creada. Ahora inicia sesión.');
        return;
      }

      const role = response.user.role === 'ADMIN' ? 'admin' : 'patient';
      window.localStorage.setItem('accessToken', response.access_token ?? '');
      window.localStorage.setItem('userRole', role);
      setCurrentUser(role);
      setAuthForm({ email: '', password: '', name: '' });
      setAuthTurnstileToken('');
      setShowLoginModal(false);
      setCurrentView(role === 'admin' ? 'admin_dashboard' : 'landing');
      await loadAppointments();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsSubmittingAuth(false);
    }

  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('userRole');
    setCurrentView('landing');
    setBookingStep(1);
  };

  const confirmAppointment = async () => {
    const token = window.localStorage.getItem('accessToken');
    if (!token || !selectedDate || !selectedTime) return;

    setBookingError('');
    try {
      const appointmentDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);

      await authenticatedRequest('/appointments', token, {
        method: 'POST',
        body: JSON.stringify({
          date: appointmentDate.toISOString(),
          type: 'Online',
          turnstileToken: bookingTurnstileToken || undefined,
        }),
      });
      setBookingStep(2);
      setBookingTurnstileToken('');
    } catch (error) {
      setBookingError(error.message);
    }
  };

  const startConsultation = (patient) => {
    setActivePatient(patient);
    setConsultationError('');
    setConsultationForm({ notes: '', weight: '', bodyFat: '', muscleMass: '', actionPlan: '' });
    setCurrentView('consultation');
  };

  const saveConsultation = async () => {
    const token = window.localStorage.getItem('accessToken');
    if (!token || !activePatient?._id) return;

    try {
      setConsultationError('');
      await authenticatedRequest('/consultations', token, {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: activePatient._id,
          notes: consultationForm.notes,
          actionPlan: consultationForm.actionPlan,
          weight: consultationForm.weight ? Number(consultationForm.weight) : undefined,
          bodyFat: consultationForm.bodyFat ? Number(consultationForm.bodyFat) : undefined,
          muscleMass: consultationForm.muscleMass ? Number(consultationForm.muscleMass) : undefined,
        }),
      });
      await authenticatedRequest(`/appointments/${activePatient._id}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      setCurrentView('admin_dashboard');
      await loadAppointments();
    } catch (error) {
      setConsultationError(error.message);
    }
  };

  // ---------------------------------------------------------
  // COMPONENTE: MODAL DE LOGIN
  // ---------------------------------------------------------
  const loginModal = (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={() => setShowLoginModal(false)} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="text-center mb-8 mt-4">
          <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Iniciar Sesión</h2>
          <p className="text-slate-500 mt-2 text-sm">Para agendar tu hora y ver tu historial, ingresa a tu cuenta.</p>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authMode === 'register' && (
            <input
              value={authForm.name}
              onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
              placeholder="Nombre completo"
              required
              minLength={2}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
            />
          )}
          <input
            type="email"
            value={authForm.email}
            onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
            placeholder="Correo electrónico"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
          />
          <input
            type="password"
            value={authForm.password}
            onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
            placeholder="Contraseña"
            required
            minLength={8}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
          />
          {turnstileSiteKey && (
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={setAuthTurnstileToken}
              onExpire={() => setAuthTurnstileToken('')}
            />
          )}
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <button disabled={isSubmittingAuth} className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white p-4 rounded-xl font-medium flex items-center justify-center gap-3 transition-all shadow-md">
            {authMode === 'login' ? <User className="h-5 w-5" /> : <Leaf className="h-5 w-5 text-emerald-400" />}
            {isSubmittingAuth ? 'Procesando...' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
            className="w-full text-sm text-purple-700 hover:text-purple-900"
          >
            {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </form>
      </div>
    </div>
  );

  // ---------------------------------------------------------
  // VISTA 2: DASHBOARD ADMINISTRADOR
  // ---------------------------------------------------------
  if (currentView === 'admin_dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        <div className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-12">
            <Leaf className="h-6 w-6 text-emerald-400" />
            <span className="font-serif text-xl font-bold">Portal Nutri</span>
          </div>
          <nav className="flex-1 space-y-2">
            <button onClick={() => setAdminSection('agenda')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${adminSection === 'agenda' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}><CalendarIcon className="h-5 w-5" /> Agenda Hoy</button>
            <button onClick={() => setAdminSection('patients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${adminSection === 'patients' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}><User className="h-5 w-5" /> Pacientes</button>
            <button onClick={() => setAdminSection('files')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${adminSection === 'files' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}><FileText className="h-5 w-5" /> Pautas y Archivos</button>
          </nav>
          <button onClick={handleLogout} className="flex items-center gap-3 text-slate-400 hover:text-red-400 px-4 py-3 mt-auto transition-colors">
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </button>
        </div>

        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900">Hola, Michelle 👋</h1>
              <p className="text-slate-500 mt-1">Aquí está tu agenda de consultas para hoy.</p>
            </div>
            <div className="bg-white p-2 rounded-full shadow-sm border border-slate-200">
              <img src={fotoMichelle} alt="Michelle" className="w-10 h-10 rounded-full object-cover" />
            </div>
          </div>

          <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden ${adminSection === 'agenda' ? '' : 'hidden'}`}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Próximos Pacientes</h2>
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-2.5 text-slate-400" />
                <input type="text" placeholder="Buscar paciente..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {appointmentsError && <p className="p-6 text-sm text-red-600">{appointmentsError}</p>}
              {!appointmentsError && appointments.length === 0 && (
                <p className="p-6 text-sm text-slate-500">No hay citas registradas todavía.</p>
              )}
              {appointments.map((apt) => (
                <div key={apt._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-lg">
                      {(apt.patientName ?? apt.patientEmail ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{apt.patientName ?? apt.patientEmail}</h3>
                      <div className="flex gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><CalendarIcon className="h-4 w-4" /> {new Date(apt.date).toLocaleDateString('es-CL')}</span>
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(apt.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-1"><Video className="h-4 w-4" /> {apt.type}</span>
                        <span className="font-medium">{apt.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startConsultation({ ...apt, patient: apt.patientName ?? apt.patientEmail })} className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Iniciar Consulta
                    </button>
                    {apt.status === 'PENDING' && <button onClick={async () => { const token = window.localStorage.getItem('accessToken'); await authenticatedRequest(`/appointments/${apt._id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) }); await loadAppointments(); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-colors">Confirmar</button>}
                    <button onClick={async () => { const token = window.localStorage.getItem('accessToken'); await authenticatedRequest(`/appointments/${apt._id}/cancel`, token, { method: 'PATCH' }); await loadAppointments(); }} className="bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 px-4 py-2.5 rounded-xl transition-colors">
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {adminSection === 'patients' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Pacientes</h2>
              {Array.from(new Map(appointments.map((appointment) => [appointment.patientEmail, appointment])).values()).map((patient) => (
                <div key={patient.patientEmail} className="border-b border-slate-100 py-4 last:border-0">
                  <p className="font-semibold text-slate-900">{patient.patientName}</p>
                  <p className="text-sm text-slate-500">{patient.patientEmail}</p>
                </div>
              ))}
              {appointments.length === 0 && <p className="text-sm text-slate-500">Todavía no hay pacientes con citas.</p>}
            </div>
          )}

          {adminSection === 'files' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Pautas y Archivos</h2>
              <p className="text-sm text-slate-500">Los archivos seleccionables para cada consulta aparecerán aquí. Actualmente puedes adjuntar la pauta desde la sala de consulta.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // VISTA 3: SALA DE CONSULTA Y ENVÍO DE PDF
  // ---------------------------------------------------------
  if (currentView === 'consultation' && activePatient) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('admin_dashboard')} className="text-slate-400 hover:text-slate-700">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div>
              <h2 className="font-bold text-slate-900 text-xl">Consulta en curso: {activePatient.patient}</h2>
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activa ahora
              </span>
            </div>
          </div>
          <button onClick={saveConsultation} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
            <Send className="h-4 w-4" /> Finalizar y Enviar Pauta (PDF)
          </button>
        </div>

        <div className="max-w-5xl mx-auto p-8 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-600" /> Registro Clínico</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de consulta / Anamnesis actual</label>
                  <textarea rows="4" value={consultationForm.notes} onChange={(event) => setConsultationForm({ ...consultationForm, notes: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="Escribe aquí las observaciones..."></textarea>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
                    <input type="number" value={consultationForm.weight} onChange={(event) => setConsultationForm({ ...consultationForm, weight: event.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">% Grasa</label>
                    <input type="number" value={consultationForm.bodyFat} onChange={(event) => setConsultationForm({ ...consultationForm, bodyFat: event.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">M. Muscular</label>
                    <input type="number" value={consultationForm.muscleMass} onChange={(event) => setConsultationForm({ ...consultationForm, muscleMass: event.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plan de acción / Indicaciones (Esto irá en el PDF)</label>
                  <textarea rows="6" value={consultationForm.actionPlan} onChange={(event) => setConsultationForm({ ...consultationForm, actionPlan: event.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="1. Aumentar consumo de agua..."></textarea>
                </div>
                {consultationError && <p className="text-sm text-red-600">{consultationError}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
              <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2"><FileText className="h-5 w-5" /> Adjuntos para el paciente</h3>
              <p className="text-sm text-purple-700 mb-4">Estos archivos se enviarán por correo al finalizar la sesión.</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                  <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-slate-300" defaultChecked />
                  <span className="text-sm font-medium text-slate-700">Minuta Semanal Base.pdf</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                  <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-slate-300" />
                  <span className="text-sm font-medium text-slate-700">Guía de Porciones.pdf</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // VISTA 4: LANDING PAGE (PÚBLICA)
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-stone-50 font-sans text-slate-800 relative">
      
      {showLoginModal && loginModal}

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <Leaf className="h-6 w-6 text-emerald-600" />
              <span className="font-serif text-2xl text-purple-900 font-bold tracking-tight">Michelle Morales</span>
            </div>
            
            <div className="hidden md:flex space-x-8 items-center">
              <a href="#sobre-mi" className="text-slate-600 hover:text-purple-700 font-medium">Sobre mí</a>
              <a href="#servicios" className="text-slate-600 hover:text-purple-700 font-medium">Servicios</a>
              
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Sesión iniciada
                  </span>
                  <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 font-medium">Salir</button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowLoginModal(true)} 
                  className="flex items-center gap-2 text-purple-700 font-medium hover:text-purple-800"
                >
                  <User className="h-5 w-5" /> Iniciar Sesión
                </button>
              )}
              
              <a href="#agendar" className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md">
                Agendar Hora
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-purple-50/50 -z-10" />
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-800 font-medium text-sm mb-8">
            <Heart className="h-4 w-4" fill="currentColor" />
            <span>Un espacio seguro y de confianza</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 font-bold tracking-tight mb-6">
            Consulta Nutricional <span className="text-purple-700">Integral</span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Te acompaño a mejorar tu relación con la alimentación, desde la educación, el respeto y la empatía.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a href="#agendar" className="bg-purple-700 hover:bg-purple-800 text-white px-8 py-4 rounded-full font-medium text-lg shadow-lg flex items-center justify-center gap-2 transition-all">
              Agendar mi evaluación <ChevronRight className="h-5 w-5" />
            </a>
          </div>

        </div>
      </section>

      {/* ABOUT ME SECTION (RESTAURADA A TEXTO ORIGINAL COMPLETO) */}
      <section id="sobre-mi" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
            
            <div className="w-full lg:w-1/2 relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden relative shadow-2xl">
                <img 
                  src={fotoMichelle.src}
                  alt="Michelle Morales - Nutricionista" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent"></div>
              </div>
              
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl max-w-xs border border-purple-50 hidden md:block">
                <p className="text-purple-800 font-serif font-bold text-lg leading-tight">
                  "Comer saludable no tiene por qué ser complicado 💜"
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <h2 className="text-purple-700 font-semibold tracking-wide uppercase text-sm mb-3">¡Hola a todos y todas!</h2>
              <h3 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">
                Soy Michelle Morales
              </h3>
              <div className="space-y-5 text-lg text-slate-600 leading-relaxed">
                <p>
                  Nutricionista egresada de la <strong className="text-slate-800">Universidad Católica del Norte</strong>. Quiero darte la bienvenida a este espacio creado para compartir información, educación y herramientas que te ayuden a cuidar tu salud a través de la alimentación.
                </p>
                <p>
                  Creo en una nutrición basada en la evidencia, pero también en la <strong className="text-purple-700">empatía, el respeto y la realidad de cada persona.</strong> Mi propósito es acompañarte a mejorar tu relación con la alimentación y tu bienestar de forma integral, sin juicios.
                </p>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mt-6 relative overflow-hidden">
                  <Leaf className="absolute -right-4 -bottom-4 h-24 w-24 text-emerald-100 opacity-50" />
                  <p className="relative z-10 text-emerald-900 font-medium italic">
                    Aquí no se trata de dietas restrictivas, sino de aprender, entender tu cuerpo y construir hábitos que realmente puedas mantener en el tiempo.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICES SECTION (LOS 6 SERVICIOS RESTAURADOS) */}
      <section id="servicios" className="py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-purple-700 font-semibold tracking-wide uppercase text-sm mb-3">¿En qué puedo ayudarte?</h2>
            <h3 className="text-3xl md:text-4xl font-serif font-bold text-slate-900">
              Servicios Nutricionales
            </h3>
            <p className="mt-4 text-lg text-slate-600">
              Cada persona tiene una historia, objetivos y necesidades diferentes. Nos enfocaremos en construir hábitos que se adapten a tu estilo de vida.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Evaluación Nutricional</h4>
              <p className="text-slate-600">Evaluación completa para conocer tu estado de salud actual y determinar tus necesidades específicas.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-6">
                <Info className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Antropometría (ISAK 1)</h4>
              <p className="text-slate-600">Medición certificada para un análisis profundo y preciso de tu composición corporal.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Ciclo Vital Completo</h4>
              <p className="text-slate-600">Atención especializada para embarazadas, niños, adolescentes, adultos y adultos mayores.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Patologías Crónicas</h4>
              <p className="text-slate-600">Manejo nutricional específico para patologías cardiovasculares y trastornos metabólicos.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mb-6">
                <Leaf className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Nutrición Deportiva</h4>
              <p className="text-slate-600">Planes adaptados a tus entrenamientos para maximizar rendimiento y recuperación.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mb-6">
                <BookOpen className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Educación Alimentaria</h4>
              <p className="text-slate-600">Herramientas prácticas adaptadas a tu realidad para que tomes decisiones informadas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MODALITIES SECTION */}
      <section id="modalidades" className="py-20 bg-purple-900 text-white relative">
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <h3 className="text-3xl font-serif font-bold mb-12">Modalidades de Atención</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 p-8 rounded-3xl border border-white/20 hover:bg-white/15">
              <Home className="h-8 w-8 text-white mx-auto mb-4" />
              <h4 className="text-xl font-bold mb-2">En mi consulta</h4>
              <p className="text-purple-200 text-sm">Un espacio acondicionado para recibirte.</p>
            </div>
            <div className="bg-white/10 p-8 rounded-3xl border border-white/20 hover:bg-white/15">
              <MapPin className="h-8 w-8 text-white mx-auto mb-4" />
              <h4 className="text-xl font-bold mb-2">A domicilio</h4>
              <p className="text-purple-200 text-sm">Voy a tu hogar para mayor comodidad.</p>
            </div>
            <div className="bg-white/10 p-8 rounded-3xl border border-white/20 hover:bg-white/15">
              <Video className="h-8 w-8 text-white mx-auto mb-4" />
              <h4 className="text-xl font-bold mb-2">Online</h4>
              <p className="text-purple-200 text-sm">Consulta desde cualquier lugar del mundo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING SECTION */}
      <section id="agendar" className="py-24 bg-white relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-purple-700 font-semibold tracking-wide uppercase text-sm mb-3">Reserva tu espacio</h2>
            <h3 className="text-3xl font-serif font-bold text-slate-900 mb-4">Agenda tu Evaluación</h3>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-8">
            
            {!currentUser ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Inicia sesión para agendar</h3>
                <p className="text-slate-600 max-w-md mx-auto mb-8">
                  Para proteger la agenda de Michelle y llevar un registro ordenado de tus pautas clínicas, necesitas ingresar a tu cuenta para tomar una hora.
                </p>
                <button 
                  onClick={() => setShowLoginModal(true)} 
                  className="bg-purple-700 hover:bg-purple-800 text-white px-8 py-3 rounded-full font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-purple-200"
                >
                  <User className="h-5 w-5" /> Iniciar Sesión o Registrarse
                </button>
              </div>
            ) : (
              <div>
                {bookingStep === 1 && (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-purple-700" /> Elige un día</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {availableDays.map((date, idx) => (
                          <button key={idx} onClick={() => { setSelectedDate(date); setSelectedTime(null); }} className={`p-2 rounded-xl border text-center transition-all ${selectedDate === date ? 'border-purple-700 bg-purple-50 text-purple-900 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-300 text-slate-700'}`}>
                            <div className="text-2xl font-bold">{date.getDate()}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-purple-700" /> Elige hora</h4>
                      {selectedDate ? (
                        <div className="grid grid-cols-2 gap-2">
                          {timeSlots.map((time, idx) => (
                            <button key={idx} onClick={() => setSelectedTime(time)} className={`p-3 rounded-xl border text-center font-medium transition-all ${selectedTime === time ? 'border-purple-700 bg-purple-700 text-white' : 'border-slate-200 hover:border-purple-700 text-slate-700'}`}>
                              {time}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50"><p className="text-slate-400 text-sm">Selecciona un día primero</p></div>
                      )}
                    </div>
                    <div className="md:col-span-2 pt-6 mt-6 border-t border-slate-100 flex justify-end">
                      <div className="flex flex-col items-end gap-2">
                        {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}
                        {turnstileSiteKey && (
                          <Turnstile
                            siteKey={turnstileSiteKey}
                            onSuccess={setBookingTurnstileToken}
                            onExpire={() => setBookingTurnstileToken('')}
                          />
                        )}
                        <button disabled={!selectedDate || !selectedTime} onClick={confirmAppointment} className="bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white px-8 py-3 rounded-full font-medium transition-colors">Confirmar Cita</button>
                      </div>
                    </div>
                  </div>
                )}
                
                {bookingStep === 2 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="h-10 w-10 text-emerald-600" /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Hora Solicitada!</h3>
                    <p className="text-slate-600 mb-6">Tu cita ha sido enviada al calendario de Michelle.</p>
                    <button onClick={() => { setBookingStep(1); setSelectedDate(null); setSelectedTime(null); }} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-full font-medium">Volver a mi perfil</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {currentUser === 'patient' && (
        <section className="py-12 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Mis horas</h3>
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500">Todavía no tienes horas agendadas.</p>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <div key={appointment._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{new Date(appointment.date).toLocaleString('es-CL')}</p>
                        <p className="text-sm text-slate-500">{appointment.type} · {appointment.status}</p>
                      </div>
                      {appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
                        <button onClick={async () => { const token = window.localStorage.getItem('accessToken'); await authenticatedRequest(`/appointments/${appointment._id}/cancel`, token, { method: 'PATCH' }); await loadAppointments(); }} className="text-sm text-red-600 hover:text-red-800 font-medium">Cancelar hora</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="bg-slate-900 px-4 py-8 text-center text-sm text-slate-300">
        <p>Ignacio Rodríguez • Claudio Palta | 2026 | Cloud Computing</p>
      </footer>

    </div>
  );
}