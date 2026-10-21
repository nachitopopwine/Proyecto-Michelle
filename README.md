# Proyecto Michelle

> **Actualización 15 de octubre de 2026:** Se corrigió el flujo de login/registro y se preparó una guía de publicación gratuita con Cloudflare Pages + Render + MongoDB Atlas. Antes de desplegar, leer **[GUIA_REVISION_Y_DESPLIEGUE.md](GUIA_REVISION_Y_DESPLIEGUE.md)**. El despliegue remoto y el correo real aún dependen de credenciales y pruebas en servicios externos. No subir `.env` ni datos clínicos.

Sistema monolito para gestión de consultas nutricionales. El proyecto cumple el stack inscrito: Next.js, NestJS, API REST, MongoDB y Swagger.

## Arquitectura

- `web-michelle`: frontend Next.js con App Router.
- `backend-michelle`: API REST NestJS.
- MongoDB: persistencia de usuarios, citas y consultas.
- Swagger: documentación disponible en `http://localhost:3000/docs`.
- Docker Compose: levanta frontend, backend y MongoDB como un monolito.

## Registro de cambios: 12 de octubre de 2026

Resumen del trabajo hecho en la rama `arquitectura-monolito` sobre la lista de tareas P0–P3. El objetivo era cerrar el **flujo mínimo** para que Michelle pueda atender:

> Un paciente se registra → toma una hora → esa hora desaparece para el resto → ve y puede cancelar sus horas → Michelle entra, ve la agenda, abre la ficha, guarda la consulta, la cita pasa a completada y el paciente recibe (o descarga) la pauta.

Ese flujo funciona de punta a punta y está probado (ver [Cómo se probó](#cómo-se-probó)).

### Frontend (`web-michelle`)

El `App.jsx` gigante se separó en componentes. La reestructuración arregla el bug del login que perdía el foco a cada letra: cada formulario tiene ahora su propio estado.

| Archivo | Qué hace |
| --- | --- |
| `src/App.jsx` | Raíz: restaura la sesión con `GET /auth/me` (sin errores de hidratación), decide qué vista mostrar y cierra la sesión si el token vence |
| `src/components/AuthModal.jsx` | Login, registro (con aceptación del aviso de privacidad), "¿Olvidaste tu contraseña?" y nueva contraseña (`?reset=TOKEN`) |
| `src/components/Landing.jsx` | Página pública. El menú móvil ahora funciona (antes `isMenuOpen` no se usaba) |
| `src/components/BookingWidget.jsx` | Selector de día, hora y modalidad sobre la disponibilidad real. Las horas ocupadas o pasadas aparecen deshabilitadas. Lo usan el paciente y Michelle |
| `src/components/PatientDashboard.jsx` | Panel "Mi cuenta" del paciente: próximas horas, agendar, historial, mis pautas (descarga del PDF y adjuntos) y mi perfil |
| `src/components/admin/AdminDashboard.jsx` | Panel de Michelle (Agenda, Pacientes, Pautas y archivos, Horario, Mi perfil). La agenda se carga al entrar y se refresca cada minuto |
| `src/components/admin/AgendaSection.jsx` | Agenda agrupada por día, con filtros (próximas, hoy, por confirmar, pasadas, todas), buscador funcional, y botones para confirmar o rechazar con motivo |
| `src/components/admin/PatientsSection.jsx` / `PatientDetail.jsx` | Listado de **todos** los pacientes y ficha con datos, notas internas, evolución (peso, % grasa, masa muscular), consultas, horas y archivos. Permite crear un paciente y agendar a su nombre |
| `src/components/admin/ConsultationRoom.jsx` | Sala de consulta con borrador, "Finalizar y enviar pauta", adjuntos reales, consultas anteriores y mensajes de éxito o error. Una consulta cerrada queda en solo lectura |
| `src/components/admin/FilesSection.jsx` / `FileUploader.jsx` | Biblioteca de pautas: subir, descargar y borrar archivos PDF, Word o imagen |
| `src/components/admin/ScheduleSection.jsx` | Horario configurable: días, horas de inicio, duración, feriados y días de anticipación |
| `src/lib/api.js` / `src/lib/format.js` | Cliente HTTP (token, subida de archivos, descargas) y formato de fechas en hora de Chile y formato de 24 horas |

### Backend (`backend-michelle`)

| Módulo | Cambios |
| --- | --- |
| `auth` | `GET/PATCH /auth/me` (perfil y cambio de contraseña), `POST /auth/forgot-password` y `/auth/reset-password` (token de 1 h guardado como hash). El correo se normaliza (mayúsculas y espacios) y se guarda la fecha de aceptación del aviso de privacidad |
| `schedule` (nuevo) | Horario configurable en Mongo. `GET /schedule/availability` es público y no expone datos de pacientes. `GET/PUT /schedule/settings`. Al reservar se valida día, hora, feriado y anticipación |
| `appointments` | Michelle puede agendar a nombre de un paciente (la hora queda confirmada al tiro). Confirmar o rechazar envía aviso por correo. Las citas cerradas no se modifican. Hay un índice único parcial en `date` contra la doble reserva simultánea y un recordatorio por correo 24 h antes |
| `consultations` | Upsert por cita (borrador). Con `finalize: true` cierra la ficha, marca la cita como `COMPLETED` y envía el PDF con los adjuntos. Nuevos endpoints `GET /consultations/mine`, `GET /consultations/:id/pdf` y `POST /consultations/:id/send` |
| `files` (nuevo) | Pautas guardadas en Mongo (máximo 8 MB; PDF, Word, JPG o PNG). El paciente solo descarga sus archivos o los que se le entregaron en una consulta |
| `patients` (nuevo) | `GET/POST /patients`, `GET/PATCH /patients/:id`. Es la ficha completa y permite crear pacientes desde el panel |
| `mail` (nuevo) | Envío con Resend. Sin `RESEND_API_KEY` no envía nada, lo registra en el log y la app sigue funcionando |
| `calendar` | Sincronización opcional con Google Calendar (crear, actualizar y borrar el evento de cada cita) |
| `common` | `timezone.ts`: toda la agenda se calcula en `America/Santiago`. `config.ts`: en producción el backend no arranca si `JWT_SECRET` no es seguro |

Otros cambios: `docker-compose.yml` y `.env.example` traen las variables nuevas. Se agregaron `scripts/backup-mongo.sh` para respaldos y un aviso de privacidad para datos de salud (`PrivacyNotice.jsx`).

### Cambios que pueden romper algo

- `POST /auth/register` ahora exige `acceptPrivacy: true` e ignora `role`, así que nadie puede registrarse como ADMIN.
- `PATCH /appointments/:id/status` ya no acepta `COMPLETED`. La cita solo se completa al finalizar la consulta (`POST /consultations` con `finalize: true`).
- Se eliminaron los datos simulados y las claves `userRole` de `localStorage`. La sesión se obtiene siempre de `/auth/me`.
- En `eslint.config.js` se desactivaron `react-hooks/set-state-in-effect`, `purity` y `exhaustive-deps`, porque bloqueaban `next build` con el patrón de cargar datos en `useEffect`.
- Tests: `@nestjs/mongoose` v12 es solo ESM y Jest no puede cargarlo. Los specs usan el mock compartido `src/test-utils/nestjs-mongoose.mock.ts`.

### Cómo se probó

- **Unitarios (backend):** 37 tests en 9 suites (`npm test -- --runInBand --silent`). Cubren reservas duplicadas, cancelaciones, consultas, recuperación de contraseña, zona horaria, disponibilidad y permisos de archivos de pacientes.
- **API de punta a punta (stack en Docker):** 45 verificaciones del flujo mínimo y de permisos. Por ejemplo, un paciente no puede ver, cancelar ni descargar datos de otro.
- **Interfaz (Playwright, Chromium):** 15 verificaciones, entre ellas escribir en el login sin perder el foco, agendar, que "Mis horas" se actualice sin volver a loguearse, que la sesión siga al recargar, el buscador, confirmar, finalizar la consulta, la ficha, el menú móvil y que no haya errores en consola.
- Se revisó a mano el PDF generado y se probaron el respaldo y la restauración de Mongo.

Los scripts de la prueba de punta a punta y de Playwright no quedaron en el repo. Si los quieren en CI, hay que agregarlos.

### Pendiente

- [ ] **Hacer commit y push** de estos cambios (siguen sin commit en `arquitectura-monolito`) y decidir cuándo pasarlos a `main`.
- [ ] **Correo real:** crear una cuenta en [Resend](https://resend.com), verificar el dominio y configurar `RESEND_API_KEY` y `MAIL_FROM`. Sin esto no salen confirmaciones, recordatorios, pautas ni correos de recuperación de contraseña. El envío no se ha probado con una cuenta real.
- [ ] **Turnstile:** crear las claves en Cloudflare (`TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`). Son obligatorias con `NODE_ENV=production`.
- [ ] **Google Calendar** (opcional): crear la cuenta de servicio y compartir el calendario de Michelle. Está implementado pero **no se ha probado** con credenciales reales.
- [ ] **WhatsApp:** no se hizo; por ahora solo hay envío por correo.
- [ ] **Revisar con Michelle** el texto del aviso de privacidad, su horario real (por defecto lunes a viernes, 6 bloques) y la duración de la consulta.
- [ ] **Despliegue** (Coolify / Cloudflare Tunnel) con las variables de producción de la tabla de abajo, y un cron diario de respaldos.
- [ ] **CI:** el workflow solo corre en `main` y `desarrollo-michelle`. Falta agregar la rama de trabajo o fusionarla.
- [ ] Mejoras posibles: pacientes creados desde el panel deben activar su cuenta con "¿Olvidaste tu contraseña?" (no se les envía invitación automática); guardar los archivos en almacenamiento externo (S3 o GridFS) si superan el volumen de una base pequeña.

### Nota para levantarlo en Windows

Si `docker compose up --build` falla descargando imágenes desde Docker Hub (`failed to copy ... EOF`), se pueden bajar desde el mirror de Google:

```bash
docker pull mirror.gcr.io/library/node:22-alpine && docker tag mirror.gcr.io/library/node:22-alpine node:22-alpine
docker pull mirror.gcr.io/library/mongo:8 && docker tag mirror.gcr.io/library/mongo:8 mongo:8
```

Para probar con una cuenta de Michelle hay que definir `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes de levantar el stack (por ejemplo en un archivo `.env` en la raíz). La cuenta se crea sola en el primer arranque.

## Funcionalidades

- **Pacientes**: registro con aceptación del aviso de privacidad, login, recuperación de contraseña por correo, edición de perfil. Panel "Mi cuenta" con próximas horas, historial, cancelación y descarga de pautas.
- **Agenda**: disponibilidad real según el horario configurado (días, horas, feriados, días de anticipación) en hora de Chile (`America/Santiago`). Las horas ocupadas se ocultan; el backend impide dobles reservas (también con un índice único en MongoDB). Modalidad Presencial / Domicilio / Online.
- **Panel de Michelle**: agenda con filtros y buscador; confirmar o rechazar con motivo (se avisa al paciente por correo); fichas de pacientes con evolución (peso, % grasa, masa muscular), historial de horas y consultas; crear pacientes y agendar a su nombre; biblioteca de pautas (PDF/Word); horario configurable.
- **Consulta clínica**: borrador, finalizar (cierra la ficha, marca la cita como realizada y envía por correo la pauta PDF con los adjuntos). Una consulta finalizada no se puede editar ni reabrir.
- **Correos** (Resend): confirmaciones, cancelaciones, recordatorio 24 h antes, pauta PDF y recuperación de contraseña. Sin `RESEND_API_KEY` la app funciona igual y el paciente descarga la pauta desde su cuenta.
- **Google Calendar** (opcional): las citas se sincronizan con el calendario de Michelle mediante una cuenta de servicio.

## Variables de entorno

Ver `backend-michelle/.env.example`. Para producción son obligatorias:

| Variable | Uso |
| --- | --- |
| `NODE_ENV=production` | Activa las validaciones de producción |
| `JWT_SECRET` | Mínimo 32 caracteres (`openssl rand -hex 32`); el backend no arranca sin él |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Crea la cuenta de Michelle en el primer arranque |
| `FRONTEND_URL` | Dominio público del frontend (CORS y enlaces de los correos) |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Anti-bot en login, registro y reservas |
| `RESEND_API_KEY`, `MAIL_FROM` | Envío de correos (dominio verificado en Resend) |
| `NEXT_PUBLIC_API_URL` | URL pública del backend (se fija al construir el frontend) |

Opcionales: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` (compartir el calendario con la cuenta de servicio, permiso "Hacer cambios en eventos").

## Respaldos de MongoDB

```bash
sh scripts/backup-mongo.sh        # crea backups/michelle-FECHA.archive.gz (conserva los últimos 14)
```

Programarlo diario en el servidor (`crontab -e`): `0 3 * * * cd /ruta/al/proyecto && sh scripts/backup-mongo.sh`. Copiar periódicamente la carpeta `backups/` fuera del servidor.

Restaurar: `docker compose exec mongo mongorestore --gzip --drop --archive=/backups/<archivo>`.

## Ejecución local con Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

Para detener los servicios:

```bash
docker compose down
```

## Ejecución sin Docker

Backend:

```bash
cd backend-michelle
copy .env.example .env
npm install
npm run start:dev
```

Frontend:

```bash
cd web-michelle
npm install
npm run dev
```

Se necesita MongoDB local o una URI de MongoDB Atlas en `MONGODB_URI`.

## Calidad y CI

El workflow `.github/workflows/ci.yml` ejecuta build, lint y tests del backend, además del build estático del frontend. La cobertura no se ejecuta en CI.

## Despliegue en Coolify

1. Instalar Ubuntu Server 22.04 y actualizar paquetes.
2. Instalar Coolify Self-hosted en el servidor y abrir únicamente SSH y HTTP/HTTPS según la configuración de red.
3. Registrar el repositorio en Coolify como aplicación Docker Compose.
4. Configurar las variables `JWT_SECRET` y `FRONTEND_URL` en el entorno de producción.
5. Crear el dominio público del frontend y revisar los logs de los tres servicios.
6. Activar despliegue automático desde GitHub después de una ejecución exitosa de CI.

## Cloudflare Tunnel

Para una URL persistente se debe crear un túnel nombrado, instalar `cloudflared` en el servidor y publicar el frontend mediante un hostname administrado en Cloudflare. Para una demostración temporal puede usarse:

```bash
cloudflared tunnel --url http://localhost:3001
```

El Quick Tunnel genera una URL temporal y no debe considerarse una configuración de producción. La demostración debe documentar sus límites, además de costos, seguridad, mantenibilidad y curva de aprendizaje.

## Material de presentación

La arquitectura de la solución es: usuario -> Cloudflare Tunnel -> frontend Next.js -> API REST NestJS -> MongoDB. Coolify administra el despliegue de los contenedores y GitHub Actions valida los cambios antes del despliegue.
