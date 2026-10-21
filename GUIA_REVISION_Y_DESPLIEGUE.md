# Revisión técnica y despliegue gratuito — Michelle

Actualizado: 20 de octubre de 2026. **Estado: código compilado y probado localmente; MongoDB Atlas, servicios externos y prueba integral siguen pendientes. El despliegue lo continuará el equipo.**

### Avance de esta etapa

- Backend sin conexión silenciosa a MongoDB local: carga su `.env` local si existe y exige una `MONGODB_URI` completa. **La conexión real a Atlas quedó para la siguiente etapa.**
- Frontend en puerto 3001 y API en 3000. El registro, la sesión y los menús conservan el flujo descrito abajo.
- Corregidos el cálculo de la próxima visita, la protección de archivos entre pacientes y la conservación de archivos ya entregados. Las reservas esperan el resultado del envío de avisos antes de responder.
- Identidad de Michelle Palta unificada en interfaz, PDF, correos y ejemplos. Dependencias de producción actualizadas; auditoría de producción sin hallazgos en ambos paquetes al terminar esta etapa.
- CI ajustado para ejecutar build, lint y pruebas del backend en una sola pasada, y build estático del frontend.

**Siguiente validación:** conectar Atlas y hacer la prueba manual del apartado 2. Configurar y verificar Resend, Turnstile y recordatorios en el entorno final. Google Calendar permanece opcional; WhatsApp no forma parte del alcance.

## 1. Lo que cambié (rutas desde la raíz de este repositorio)

| Archivo | Corrección y motivo |
| --- | --- |
| `web-michelle/src/App.jsx` | Se quita el `setView('account')` que redirigía automáticamente luego de `GET /auth/me`; login, registro y recarga muestran la landing con sesión activa. Se pasa pestaña elegida a la cuenta. |
| `web-michelle/src/components/Landing.jsx` | En computador se agregó **Mi espacio**, menú con **Mis horas**, **Agendar**, **Historial**, **Mis pautas** y **Mi perfil**. En móvil aparecen las cinco opciones. Para ADMIN se mantiene Panel de administración. |
| `web-michelle/src/components/PatientDashboard.jsx` | Recibe `initialTab` para abrir directamente la sección solicitada desde la landing; sigue pudiendo regresar al inicio sin cerrar sesión. |
| `web-michelle/src/components/admin/AdminDashboard.jsx` | Se añade botón para volver a la landing sin cerrar sesión. |
| `backend-michelle/src/auth/auth.service.ts` | `POST /auth/register` retorna también un JWT tras comprobar el captcha y crear la cuenta. |
| `backend-michelle/src/auth/auth.service.spec.ts` | Ajuste de prueba para la respuesta del registro. |
| `web-michelle/src/components/AuthModal.jsx` | Se elimina el segundo `/auth/login` posterior al registro: en producción faltaba captcha y fallaría. Se renueva Turnstile cuando corresponde, y se bloquea enviar sin captcha si está habilitado. |
| `web-michelle/src/components/BookingWidget.jsx` | Se renueva Turnstile después de solicitar una hora; el token es de un solo uso. |
| `backend-michelle/src/mail/mail.service.ts` | Envío activo **solo si están configurados tanto `RESEND_API_KEY` como `MAIL_FROM`**. No utiliza silenciosamente el remitente de pruebas como alternativa. |
| `backend-michelle/src/appointments/reminders.controller.spec.ts` | Pruebas del secreto del endpoint de recordatorios. |
| `backend-michelle/src/appointments/reminders.controller.ts` | Nuevo endpoint `POST /internal/reminders` protegido con `CRON_SECRET` para despertar Render y procesar correos pendientes desde GitHub Actions. |
| `backend-michelle/src/appointments/appointments.module.ts` | Registra el endpoint de recordatorios. |
| `backend-michelle/src/main.ts` | Oculta Swagger en producción (salvo `ENABLE_SWAGGER=true`). |
| `backend-michelle/.env.example` | Documenta `CRON_SECRET` y `ENABLE_SWAGGER`. |
| `.gitignore` | Bloquea secretos `.env*`, paquetes instalados y artefactos de compilación, preservando los `.env.example`. |
| `web-michelle/next.config.mjs` | Permite `DEPLOY_STATIC=true` para Cloudflare Pages, conservando standalone para Docker. |
| `render.yaml` | Blueprint orientativo del único servidor API gratuito, sin credenciales incrustadas. |
| `.github/workflows/ci.yml` | Compilación y pruebas automáticas al hacer push; incluye rama `arquitectura-monolito`. |
| `.github/workflows/recordatorios.yml` | Ejecución horaria opcional de recordatorios. |

No se implementó WhatsApp, como se solicitó. La integración opcional de Google Calendar quedó sin credenciales y no se considera necesaria para presentar.

## 2. Cómo debe funcionar la demostración

**Paciente**: entrar a la misma página pública de Michelle → iniciar sesión o registrarse → **permanecer en la página de inicio** → abrir **Mi espacio** → Mis horas / Agendar / Historial / Mis pautas / Mi perfil. También puede agendar desde la sección **Agendar** de la página principal. Tras reservar, la hora debe aparecer en Mis horas y ocultarse de disponibilidad pública; una hora cancelada debe volver a estar libre. En correo real, se notifica solicitud/confirmación/cancelación si Resend está configurado.

**Nutricionista (ADMIN)**: iniciar sesión → página principal → **Panel de administración** → confirmar/rechazar horas → abrir ficha del paciente → registrar consulta → finalizar → aparecerá en historial y pautas del paciente; PDF descargable por usuario autorizado. El panel permite regresar al inicio sin salir de su sesión.

**Recuperación de contraseña**: iniciar sesión → ¿Olvidaste tu contraseña? → correo con URL pública correcta → `?reset=TOKEN` → establecer contraseña → iniciar sesión. Si falta correo real, no puede verificarse este flujo desde una cuenta de correo; no publicar como funcional hasta hacer la prueba.

### Prueba manual imprescindible con dos navegadores

1. Abrir ventana normal (cuenta paciente) e incógnita (cuenta Michelle ADMIN).
2. Registrarse en paciente con correo de prueba, aceptar privacidad y completar Turnstile. Confirmar que se mantiene la landing y aparece **Mi espacio**.
3. Reservar bloque T. Confirmar que T desaparece en otra sesión y que en **Mis horas** aparece como PENDING.
4. Como Michelle, confirmar la cita; verificar estado CONFIRMED, notificación en correo si corresponde.
5. Como paciente, editar perfil y comprobar tras recargar que persiste; validar también acceso a historial, pautas y descarga.
6. Abrir la consulta en el panel ADMIN, guardar un borrador, finalizarla, comprobar estado COMPLETED y PDF visible solo al paciente asociado.
7. Probar cancelación de otra cita y que el bloque se libere. Probar usuario B y confirmar que no ve citas, PDF ni archivos de usuario A.
8. Probar restablecimiento de contraseña por **correo real**, no por logs. Verificar recepción y remitente.
9. Validar vistas móvil y escritorio y revisar consola y pestaña Network (sin 401/403/500 inesperados).

## 3. Arquitectura sugerida para DEMO realmente gratuita

`Visitante → Cloudflare Pages (Next estático) → Render Web Service Free (NestJS) → MongoDB Atlas M0 (MongoDB)`, más Resend Free para emails, Cloudflare Turnstile Free y GitHub Actions (opcional) para recordatorios.

¿Por qué así? El frontend contiene una sola página Next que consulta la API desde el navegador, sin funcionalidad SSR imprescindible; se puede exportar estático. Esto ahorra una segunda instancia Render y evita el límite compartido de horas gratis. **Cloudflare Pages NO aloja NestJS ni MongoDB.**

### Paso A — preparar GitHub correctamente

1. Trabajar sobre una copia del proyecto **sin** carpetas `node_modules`, `.next`, `dist` ni `.git` del ZIP. No subir ningún `.env`, credenciales, backups, archivos clínicos ni base de datos.
2. Crear/repositorio privado o usar el repositorio existente si se tienen permisos. Desde PowerShell, en la raíz del proyecto:
   ```powershell
   git status
   git switch arquitectura-monolito
   git add .
   git commit -m "Corrige sesión, registro, captcha y prepara deploy gratuito"
   git push -u origin arquitectura-monolito
   ```
   Si la rama no existe localmente, revisarla con `git branch -a` antes de ejecutar `git switch`. Evitar reemplazar a ciegas cambios de otras personas; idealmente crear Pull Request hacia `main` y fusionar cuando CI esté en verde.
3. Mantener los secretos **fuera** de GitHub. No usar el ZIP original para publicar: traía `.env` con valores configurados. Si `.env` llegó a ser versionado alguna vez, `.gitignore` no basta: quitarlo del índice con `git rm --cached .env`, rotar las claves e investigar el historial antes de publicar.

### Paso B — base de datos MongoDB Atlas

1. Abrir <https://www.mongodb.com/cloud/atlas> y crear proyecto de prueba, clúster **Free / M0** (no Ephemeral sin reclamar: el efímero caduca).
2. Crear un usuario **de base de datos** con contraseña fuerte y privilegios restringidos al DB `michelle`. No utilizar el usuario de login de la consola de Atlas como usuario de conexión de la aplicación.
3. En `Network Access`, permitir la IP saliente del backend si se conoce. Los servicios gratuitos de Render no garantizan IP saliente fija; usar `0.0.0.0/0` sería un compromiso de seguridad **solo tolerable en una prueba con datos sintéticos** y una contraseña única. Para datos clínicos reales exigir conectividad restrictiva.
4. `Connect → Drivers → Node.js`; obtener URL tipo `mongodb+srv://USUARIO:CLAVE@cluster.../michelle?retryWrites=true&w=majority` y guardarla solo en Render como `MONGODB_URI`. Codificar caracteres especiales de la contraseña en URL si corresponde.
5. No usar datos médicos reales para la presentación: Atlas Free tiene un límite pequeño de almacenamiento, especialmente importante porque adjuntos se guardan dentro de MongoDB.

### Paso C — backend Render gratuito

1. Abrir <https://dashboard.render.com> y conectar repo GitHub.
2. Importar `render.yaml` como Blueprint, **o** crear `New → Web Service` manualmente (más simple si no quieres Blueprints):
   - Repository: el proyecto corregido.
   - Branch: la rama con cambios y CI verde.
   - **Root directory:** `backend-michelle`.
   - Runtime: **Node**, Instance: **Free**.
   - Build command: `npm ci && npm run build`.
   - Start command: `npm run start:prod`.
   - Health check path: `/` (el proyecto responde allí).
3. En `Environment`, agregar variables (no escribir credenciales en el código):

   | Variable | Valor o procedencia |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `22.16.0` |
   | `MONGODB_URI` | String de conexión Atlas |
   | `JWT_SECRET` | Valor aleatorio mínimo 32 caracteres, **nuevo**. En PowerShell: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `FRONTEND_URL` | `https://tu-proyecto.pages.dev` (sin `/` final) |
   | `ADMIN_EMAIL` | Email con el que Michelle administrará |
   | `ADMIN_PASSWORD` | Contraseña administrativa fuerte y nueva; solo se usa para crear el primer ADMIN |
   | `ADMIN_NAME` | `Michelle Palta` |
   | `TURNSTILE_SECRET_KEY` | Clave secreta de Cloudflare Turnstile |
   | `RESEND_API_KEY` | API key secreta de Resend |
   | `MAIL_FROM` | Ejemplo: `Michelle Nutrición <agenda@dominio-verificado.cl>` |
   | `CRON_SECRET` | Otra cadena aleatoria de 32+ caracteres para recordatorios |
   | `TIME_ZONE` | `America/Santiago` |

   Si no se ha creado Cloudflare Pages, usar temporalmente la URL que se asignará luego y **actualizarla antes de probar el registro**. Si cambian variables, hacer redeploy/restart según Render.
4. Desplegar y probar `https://tu-api.onrender.com/`. Si carga `Hello World!`, la aplicación Nest arrancó. Con `NODE_ENV=production`, `/docs` queda cerrado salvo que actives `ENABLE_SWAGGER=true` solo para revisión.
5. **Límite:** Render Free duerme después de 15 min sin tráfico y el despertar puede tardar alrededor de 1 min. Los datos deben estar en Atlas (no en disco de Render). No es una plataforma apta para una clínica real con compromisos de disponibilidad.

### Paso D — captcha Cloudflare Turnstile

1. Abrir <https://dash.cloudflare.com/> → Turnstile → Add widget.
2. Agregar hostnames reales (`tu-proyecto.pages.dev` y, si corresponde, dominio personalizado; para local también `localhost` si quieres pruebas locales). Crear site key y secret key.
3. **Backend Render:** `TURNSTILE_SECRET_KEY=<secreto>`.
4. **Frontend Cloudflare Pages:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key público>`.
5. Probar con la versión desplegada: registro, login, reserva y recuperación. Si se confunde site key con secret key, el captcha fallará.

### Paso E — correo real con Resend

1. Abrir <https://resend.com> → Domains → Add Domain. Para enviar a cualquier paciente se necesita un **dominio que controles** y verificar los DNS (SPF y DKIM) en el registrador o Cloudflare DNS. Crear la API key de **envío** y guardarla en `RESEND_API_KEY` en Render.
2. `MAIL_FROM` debe ser una dirección del dominio verificado. No usar `onboarding@resend.dev` como si fuera remitente productivo: está pensado para pruebas restringidas.
   **Solo para probar con tu propio correo sin dominio comprado:** Resend permite pruebas usando `onboarding@resend.dev`, con destinatarios restringidos por las reglas de la cuenta. Puedes definir temporalmente `MAIL_FROM=Michelle <onboarding@resend.dev>`, pero **no funciona como correo general para pacientes**.
3. Reiniciar la API y realizar de verdad: (a) contraseña olvidada, (b) cita nueva, (c) confirmar/rechazar cita y (d) finalización de consulta con PDF.
4. Confirmar recepción en la bandeja **y** estado en Resend; `send()` indica que Resend aceptó la petición, no garantiza que el destinatario la leyó o la recibió. Revisar `Logs` de Render si fallan.
5. Resend Free: actualmente 3.000 emails/mes y 100 por día, sujeto a cambios del proveedor. El dominio personalizado puede tener costo anual; la plataforma de envío puede ser gratuita, **pero el dominio no necesariamente**.
6. **Privacidad:** las pautas PDF pueden contener datos sensibles. Para presentación utilizar información ficticia. Para una práctica real revisar confidencialidad, retención de datos y condiciones del proveedor antes de adjuntar historiales de salud por correo.

### Paso F — frontend Cloudflare Pages sin pagar

1. Abrir Cloudflare → **Workers & Pages** → Create → **Pages** → Import existing Git repository. Elegir repositorio y rama con los cambios.
2. Definir **Root directory:** `web-michelle`; preset **Next.js (Static HTML Export)**.
3. **Build command:** `npm run build`; **Build output directory:** `out`.
4. Variables **de construcción**:

   | Variable | Valor |
   | --- | --- |
   | `DEPLOY_STATIC` | `true` |
   | `NEXT_PUBLIC_API_URL` | `https://tu-api.onrender.com` (**sin barra final ni localhost**) |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key público de Turnstile |
   | `NODE_VERSION` | `22.16.0` |

5. Deploy. Copiar la URL `https://tu-proyecto.pages.dev` y confirmar que la misma URL está en Render como `FRONTEND_URL` para CORS y enlace del email. Si cambias `NEXT_PUBLIC_*`, **reconstruir el frontend**: esos valores se incorporan al bundle durante el build.
6. Probar desde la URL real en navegador e incógnito, incluyendo menú móvil y todo el flujo del apartado 2.

### Paso G — recordatorios con GitHub Actions (opcional, recomendado si el backend duerme)

1. En repositorio GitHub → Settings → Secrets and variables → Actions.
2. En **Variables**, crear `MICHELLE_BACKEND_URL` = `https://tu-api.onrender.com`.
3. En **Secrets**, crear `MICHELLE_CRON_SECRET` exactamente igual al `CRON_SECRET` guardado en Render.
4. Asegurarse de que `.github/workflows/recordatorios.yml` esté en la **rama por defecto** (generalmente main): los eventos `schedule` de Actions corren en la rama predeterminada.
5. Probar Actions → **Recordatorios de consultas** → **Run workflow**. Respuesta 200 `{"ok":true}`. Corre cada hora; GitHub puede demorar alguna ejecución. No garantiza recordatorios al minuto exacto, pero reduce los perdidos al dormirse Render.

### Paso H — checklist antes de mostrar a profesores

- [ ] GitHub CI `backend` y `frontend` en verde.
- [ ] Cloudflare Pages abre con HTTPS, foto y secciones correctas, sin enlace al puerto local.
- [ ] Render API responde; conexión Atlas comprobada; Turnstile acepta hosts desplegados.
- [ ] Registro nuevo crea sesión sin segundo login y deja ver la landing.
- [ ] Menú **Mi espacio** funciona en móvil/escritorio; acceso a cada pestaña.
- [ ] Reserva/cancelación/doble reserva: tanto API como interfaz y roles.
- [ ] Ficha → borrador → finalizar → pauta PDF protegida.
- [ ] Envío de correo **real** probado; restablecimiento de contraseña real probado.
- [ ] `FRONTEND_URL` y `NEXT_PUBLIC_API_URL` apuntan uno al otro (CORS correcto).
- [ ] Credenciales de demo inventadas; **nunca usar pacientes reales** en servicios Free.
- [ ] Cuentas ADMIN, reseña profesional, horarios, feriados, duración y aviso de privacidad revisados por Michelle.
- [ ] Hacer copia de seguridad externa y probar restauración antes de usar datos de valor.

## 4. Pruebas efectivamente realizadas al preparar esta corrección

- **Confirmado el 20 de octubre:** `npm run build` y `npm run lint` del backend; **37 pruebas en 9 suites** con `npm test -- --runInBand --silent`.
- **Confirmado el 20 de octubre:** `npm run lint` del frontend y `DEPLOY_STATIC=true npm run build` con una URL de API de prueba. La exportación estática terminó correctamente.
- **Confirmado:** los archivos `.env` locales permanecen ignorados por Git; las plantillas `.env.example` no incluyen valores privados.
- **Pendiente:** conexión real a Atlas, recorrido en navegador con dos usuarios, correos Resend, recuperación por correo, Turnstile en dominio real, recordatorios desplegados y publicación remota. Las pruebas unitarias no sustituyen estas comprobaciones.

## 5. Observaciones pendientes antes de usar con pacientes reales

1. **Datos de salud**: son sensibles. Un despliegue gratuito pensado para demostración no es una infraestructura clínica validada. Deben revisar protección de datos, políticas de retención, consentimiento informado, responsables, respaldos, cifrado y contratos con servicios externos conforme a la normativa chilena aplicable.
2. **Sesión JWT**: el token está en `localStorage` (archivo `web-michelle/src/lib/api.js`). Es suficiente para la demo con datos falsos, pero para producción evaluar cookies seguras HttpOnly, protección XSS, rotación/invalidez de sesión y limitación de intentos de login.
3. **Correo no obligatorio actualmente**: sin variables de Resend el servidor admite reservas y PDF descargable, pero el usuario no recibiría emails. Debe configurarse y probarse para afirmar que el requisito está listo.
4. **Almacenamiento**: `backend-michelle/src/files/files.service.ts` guarda adjuntos en MongoDB; 8 MB por archivo y Atlas Free con 512 MB total. Para un uso clínico real habría que usar almacenamiento dedicado privado y política de backups.
5. **Persistencia / cron**: `backend-michelle/src/appointments/appointments.service.ts` usa un intervalo interno de 30 minutos, que no funciona mientras Render duerme. Se añadió un disparador externo protegido, pero los recordatorios horarios no garantizan minuto exacto ni entrega de mensajes.
6. **Pruebas E2E**: el README afirma 45 verificaciones de API y 15 de navegador, pero **sus scripts no están dentro de este ZIP**. Incorporar Playwright (y pruebas de rol/permisos sobre una BD de prueba) antes de declarar cobertura integral.
7. **Git**: README dice que hay un workflow CI, pero no venía uno propio de la raíz en el ZIP inspeccionado. Se agregó uno. El repositorio ZIP contiene `.git` completo y paquetes instalados de Windows, pero esta entrega depurada no los copia.

**Conclusión:** la arquitectura se adapta a una demo funcional totalmente accesible por Internet con servicios de nivel gratuito, pero la aplicación **no puede considerarse lista para pacientes reales ni con deploy concluido** hasta finalizar credenciales, pruebas de correos y pruebas E2E sobre los servicios publicados.
