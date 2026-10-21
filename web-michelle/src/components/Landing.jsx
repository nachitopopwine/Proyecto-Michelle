'use client';

import { useState } from 'react';
import {
  Heart, Leaf, CheckCircle2, Clock, MapPin, Video, Home, ChevronRight, ChevronDown, Info, Menu, X, BookOpen, User, Lock, CalendarDays, CalendarPlus, History, FileText, UserCog,
} from 'lucide-react';
import fotoMichelle from '../assets/foto-michelle.jpeg';
import BookingWidget from './BookingWidget';
import PrivacyNotice from './PrivacyNotice';
import { Modal } from './ui';

const SERVICES = [
  [CheckCircle2, 'bg-purple-100 text-purple-700', 'Evaluación Nutricional', 'Evaluación completa para conocer tu estado de salud actual y determinar tus necesidades específicas.'],
  [Info, 'bg-emerald-100 text-emerald-700', 'Antropometría (ISAK 1)', 'Medición certificada para un análisis profundo y preciso de tu composición corporal.'],
  [Heart, 'bg-orange-100 text-orange-700', 'Ciclo Vital Completo', 'Atención especializada para embarazadas, niños, adolescentes, adultos y adultos mayores.'],
  [Clock, 'bg-red-100 text-red-700', 'Patologías Crónicas', 'Manejo nutricional específico para patologías cardiovasculares y trastornos metabólicos.'],
  [Leaf, 'bg-blue-100 text-blue-700', 'Nutrición Deportiva', 'Planes adaptados a tus entrenamientos para maximizar rendimiento y recuperación.'],
  [BookOpen, 'bg-teal-100 text-teal-700', 'Educación Alimentaria', 'Herramientas prácticas adaptadas a tu realidad para que tomes decisiones informadas.'],
];

const PATIENT_LINKS = [
  ['upcoming', 'Mis horas', CalendarDays],
  ['book', 'Agendar', CalendarPlus],
  ['history', 'Historial', History],
  ['pautas', 'Mis pautas', FileText],
  ['profile', 'Mi perfil', UserCog],
];

const NAV_LINKS = [
  ['#sobre-mi', 'Sobre mí'],
  ['#servicios', 'Servicios'],
  ['#modalidades', 'Modalidades'],
];

export default function Landing({ user, onLogin, onLogout, onOpenAccount, onOpenAccountTab }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="relative min-h-screen bg-stone-50 font-sans text-slate-800">
      {showPrivacy && (
        <Modal title="Aviso de privacidad" onClose={() => setShowPrivacy(false)} wide>
          <PrivacyNotice />
        </Modal>
      )}

      <nav className="sticky top-0 z-40 bg-white/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <a href="#" className="flex flex-shrink-0 items-center gap-2">
              <Leaf className="h-6 w-6 text-emerald-600" />
              <span className="font-serif text-2xl font-bold tracking-tight text-purple-900">Michelle Palta</span>
            </a>

            <div className="hidden items-center space-x-8 md:flex">
              {NAV_LINKS.map(([href, label]) => (
                <a key={href} href={href} className="font-medium text-slate-600 hover:text-purple-700">{label}</a>
              ))}
              {user ? (
                <div className="flex items-center gap-4">
                  {user.role === 'ADMIN' ? (
                    <button type="button" onClick={onOpenAccount} className="flex items-center gap-2 font-medium text-purple-700 hover:text-purple-800">
                      <User className="h-5 w-5" /> Panel de administración
                    </button>
                  ) : (
                    <div className="relative">
                      <button type="button" onClick={() => setAccountMenuOpen(!accountMenuOpen)} aria-expanded={accountMenuOpen} aria-haspopup="true" className="flex items-center gap-2 font-medium text-purple-700 hover:text-purple-800">
                        <User className="h-5 w-5" /> Mi espacio <ChevronDown className="h-4 w-4" />
                      </button>
                      {accountMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-3 w-48 overflow-hidden rounded-2xl border border-purple-100 bg-white py-2 shadow-xl" aria-label="Secciones de mi cuenta">
                          {PATIENT_LINKS.map(([key, label, Icon]) => (
                            <button key={key} type="button" onClick={() => { setAccountMenuOpen(false); onOpenAccountTab(key); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-purple-50">
                              <Icon className="h-4 w-4 text-purple-700" /> {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={onLogout} className="font-medium text-slate-500 hover:text-red-500">Salir</button>
                </div>
              ) : (
                <button type="button" onClick={onLogin} className="flex items-center gap-2 font-medium text-purple-700 hover:text-purple-800">
                  <User className="h-5 w-5" /> Iniciar sesión
                </button>
              )}
              <a href="#agendar" className="rounded-full bg-purple-700 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-purple-800">
                Agendar hora
              </a>
            </div>

            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} className="rounded-lg p-2 text-slate-700 md:hidden">
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="space-y-1 border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} onClick={closeMenu} className="block rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-purple-50">{label}</a>
            ))}
            {user ? (
              <>
                {user.role === 'ADMIN' ? (
                  <button type="button" onClick={() => { closeMenu(); onOpenAccount(); }} className="block w-full rounded-xl px-4 py-3 text-left font-medium text-purple-700 hover:bg-purple-50">Panel de administración</button>
                ) : (
                  <>
                    <p className="px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Mi espacio</p>
                    {PATIENT_LINKS.map(([key, label, Icon]) => (
                      <button key={key} type="button" onClick={() => { closeMenu(); onOpenAccountTab(key); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-purple-700 hover:bg-purple-50">
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </>
                )}
                <button type="button" onClick={() => { closeMenu(); onLogout(); }} className="block w-full rounded-xl px-4 py-3 text-left font-medium text-slate-500 hover:bg-red-50">Salir</button>
              </>
            ) : (
              <button type="button" onClick={() => { closeMenu(); onLogin(); }} className="block w-full rounded-xl px-4 py-3 text-left font-medium text-purple-700 hover:bg-purple-50">Iniciar sesión</button>
            )}
            <a href="#agendar" onClick={closeMenu} className="mt-2 block rounded-full bg-purple-700 px-6 py-3 text-center font-medium text-white">Agendar hora</a>
          </div>
        )}
      </nav>

      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute inset-0 -z-10 bg-purple-50/50" />
        <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/3 -translate-y-12 rounded-full bg-purple-200 opacity-30 mix-blend-multiply blur-3xl filter" />
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800">
            <Heart className="h-4 w-4" fill="currentColor" />
            <span>Un espacio seguro y de confianza</span>
          </div>
          <h1 className="mb-6 font-serif text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Consulta Nutricional <span className="text-purple-700">Integral</span>
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-xl leading-relaxed text-slate-600 md:text-2xl">
            Te acompaño a mejorar tu relación con la alimentación, desde la educación, el respeto y la empatía.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a href="#agendar" className="flex items-center justify-center gap-2 rounded-full bg-purple-700 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all hover:bg-purple-800">
              Agendar mi evaluación <ChevronRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      <section id="sobre-mi" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-20">
            <div className="relative w-full lg:w-1/2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-2xl">
                <img src={fotoMichelle.src} alt="Michelle Palta - Nutricionista" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent" />
              </div>
              <div className="absolute -right-6 -bottom-6 hidden max-w-xs rounded-2xl border border-purple-50 bg-white p-6 shadow-xl md:block">
                <p className="font-serif text-lg leading-tight font-bold text-purple-800">"Comer saludable no tiene por qué ser complicado 💜"</p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-purple-700 uppercase">¡Hola a todos y todas!</h2>
              <h3 className="mb-6 font-serif text-3xl font-bold text-slate-900 md:text-4xl">Soy Michelle Palta</h3>
              <div className="space-y-5 text-lg leading-relaxed text-slate-600">
                <p>
                  Nutricionista egresada de la <strong className="text-slate-800">Universidad Católica del Norte</strong>. Quiero darte la bienvenida a este espacio creado para compartir información, educación y herramientas que te ayuden a cuidar tu salud a través de la alimentación.
                </p>
                <p>
                  Creo en una nutrición basada en la evidencia, pero también en la <strong className="text-purple-700">empatía, el respeto y la realidad de cada persona.</strong> Mi propósito es acompañarte a mejorar tu relación con la alimentación y tu bienestar de forma integral, sin juicios.
                </p>
                <div className="relative mt-6 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                  <Leaf className="absolute -right-4 -bottom-4 h-24 w-24 text-emerald-100 opacity-50" />
                  <p className="relative z-10 font-medium text-emerald-900 italic">
                    Aquí no se trata de dietas restrictivas, sino de aprender, entender tu cuerpo y construir hábitos que realmente puedas mantener en el tiempo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="scroll-mt-20 bg-stone-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-purple-700 uppercase">¿En qué puedo ayudarte?</h2>
            <h3 className="font-serif text-3xl font-bold text-slate-900 md:text-4xl">Servicios Nutricionales</h3>
            <p className="mt-4 text-lg text-slate-600">
              Cada persona tiene una historia, objetivos y necesidades diferentes. Nos enfocaremos en construir hábitos que se adapten a tu estilo de vida.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(([Icon, colors, title, text]) => (
              <div key={title} className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${colors}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="mb-3 text-xl font-bold text-slate-900">{title}</h4>
                <p className="text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modalidades" className="relative scroll-mt-20 bg-purple-900 py-20 text-white">
        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
          <h3 className="mb-12 font-serif text-3xl font-bold">Modalidades de Atención</h3>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[[Home, 'En mi consulta', 'Un espacio acondicionado para recibirte.'], [MapPin, 'A domicilio', 'Voy a tu hogar para mayor comodidad.'], [Video, 'Online', 'Consulta desde cualquier lugar del mundo.']].map(([Icon, title, text]) => (
              <div key={title} className="rounded-3xl border border-white/20 bg-white/10 p-8 hover:bg-white/15">
                <Icon className="mx-auto mb-4 h-8 w-8 text-white" />
                <h4 className="mb-2 text-xl font-bold">{title}</h4>
                <p className="text-sm text-purple-200">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="agendar" className="relative scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-purple-700 uppercase">Reserva tu espacio</h2>
            <h3 className="mb-4 font-serif text-3xl font-bold text-slate-900">Agenda tu Evaluación</h3>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
            {!user ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-50">
                  <Lock className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-900">Inicia sesión para agendar</h3>
                <p className="mx-auto mb-8 max-w-md text-slate-600">
                  Para proteger la agenda de Michelle y llevar un registro ordenado de tus pautas clínicas, necesitas ingresar a tu cuenta para tomar una hora.
                </p>
                <button type="button" onClick={onLogin} className="inline-flex items-center gap-2 rounded-full bg-purple-700 px-8 py-3 font-medium text-white shadow-lg shadow-purple-200 transition-colors hover:bg-purple-800">
                  <User className="h-5 w-5" /> Iniciar sesión o registrarse
                </button>
              </div>
            ) : user.role === 'ADMIN' ? (
              <div className="py-8 text-center">
                <p className="mb-4 text-slate-600">Para agendar a nombre de un paciente, hazlo desde su ficha en el panel.</p>
                <button type="button" onClick={onOpenAccount} className="rounded-full bg-purple-700 px-8 py-3 font-medium text-white hover:bg-purple-800">Ir al panel</button>
              </div>
            ) : (
              <>
                <BookingWidget onBooked={() => {}} />
                <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                  <button type="button" onClick={onOpenAccount} className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-900">
                    <CalendarDays className="h-4 w-4" /> Ver mis horas y pautas
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="space-y-2 bg-slate-900 px-4 py-8 text-center text-sm text-slate-300">
        <button type="button" onClick={() => setShowPrivacy(true)} className="text-slate-400 underline hover:text-white">Aviso de privacidad</button>
        <p>Ignacio Rodríguez • Claudio Palta | 2026 | Cloud Computing</p>
      </footer>
    </div>
  );
}
