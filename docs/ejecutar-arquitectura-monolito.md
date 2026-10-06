# Guia para ejecutar Proyecto Michelle

Esta guia corresponde exclusivamente a la rama:

```text
arquitectura-monolito
```

Este proyecto se ejecuta con Docker Compose. No necesita Coolify, Ubuntu Server ni Cloudflare Tunnel.

## 1. Requisitos

Instala y abre:

- Docker Desktop
- Git
- PowerShell

Comprueba Docker:

```powershell
docker version
docker compose version
```

Debes ejecutar todos los comandos desde la raiz del proyecto:

```text
Proyecto Michelle/
├── docker-compose.yml
├── backend-michelle/
└── web-michelle/
```

## 2. Confirmar la rama

Desde la raiz:

```powershell
git branch --show-current
```

El resultado esperado es:

```text
arquitectura-monolito
```

Para cambiar a esa rama:

```powershell
git switch arquitectura-monolito
```

## 3. Variables de entorno

La aplicacion puede ejecutarse localmente sin crear un archivo `.env`, porque Compose tiene valores de desarrollo.

Para crear la cuenta de nutricionista se recomienda definir estas variables en la sesion actual de PowerShell:

```powershell
$env:ADMIN_EMAIL="michelle@example.com"
$env:ADMIN_PASSWORD="reemplaza-esta-clave"
$env:ADMIN_NAME="Michelle Morales"
```

Tambien se pueden definir las variables principales:

```powershell
$env:JWT_SECRET="clave-local-de-desarrollo"
$env:FRONTEND_URL="http://localhost:3001"
$env:NEXT_PUBLIC_API_URL="http://localhost:3000"
```

No escribas contraseñas reales dentro de archivos que se suban a GitHub.

## 4. Crear el ADMIN

La cuenta ADMIN se crea automáticamente cuando el backend arranca si existen:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_NAME
```

Ejemplo:

```powershell
$env:ADMIN_EMAIL="michelle@example.com"
$env:ADMIN_PASSWORD="UnaClaveSegura123!"
$env:ADMIN_NAME="Michelle Morales"
```

Después hay que recrear el backend para que lea las variables:

```powershell
docker compose up -d --force-recreate backend
```

La cuenta se crea sólo si ese correo todavía no existe en MongoDB.

Importante:

- No se puede crear un ADMIN enviando `role: ADMIN` desde el formulario.
- Los usuarios registrados desde el frontend son pacientes.
- La cuenta ADMIN se provisiona mediante variables de entorno.
- Si MongoDB conserva el usuario, cambiar `ADMIN_PASSWORD` no modifica la contraseña existente.

## 5. Levantar todo el sistema

Para construir y levantar los tres servicios:

```powershell
docker compose up --build -d
```

Servicios:

```text
mongo
backend
frontend
```

Ver el estado:

```powershell
docker compose ps
```

El estado esperado es:

```text
mongo      healthy
backend    Up
frontend   Up
```

## 6. URLs locales

Frontend:

```text
http://localhost:3001
```

Backend:

```text
http://localhost:3000
```

Swagger:

```text
http://localhost:3000/docs
```

MongoDB no tiene una URL web. Es interno para Docker y no publica el puerto `27017`.

## 7. Flujo del paciente

1. Abrir `http://localhost:3001`.
2. Pulsar `Iniciar Sesión`.
3. Seleccionar el registro de cuenta.
4. Crear una cuenta con:
   - nombre;
   - correo;
   - contraseña de mínimo 8 caracteres.
5. Iniciar sesión.
6. Ir a `Agendar Hora`.
7. Seleccionar día y hora.
8. Pulsar `Confirmar Cita`.
9. La cita se guarda en MongoDB.

La cita se crea como:

```text
status: PENDING
```

El `patientId` no viene libremente desde el formulario. Se obtiene desde el JWT autenticado.

## 8. Flujo de la nutricionista

1. Definir `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` en PowerShell.
2. Ejecutar:

```powershell
docker compose up -d --force-recreate backend
```

3. Abrir:

```text
http://localhost:3001
```

4. Iniciar sesión con las credenciales ADMIN.
5. El sistema abrirá el dashboard de la nutricionista.
6. El dashboard consulta las citas reales desde:

```text
GET http://localhost:3000/appointments
```

7. La nutricionista puede ver:
   - paciente;
   - correo;
   - fecha;
   - hora;
   - modalidad;
   - estado.
8. Puede cancelar una cita desde el dashboard.
9. Puede abrir `Iniciar Consulta`.
10. Puede registrar:
    - anamnesis;
    - peso;
    - porcentaje de grasa;
    - masa muscular;
    - plan de acción.
11. Al pulsar `Finalizar y Enviar Pauta`, el registro clínico se guarda en MongoDB mediante:

```text
POST http://localhost:3000/consultations
```

## 9. Endpoints principales

Autenticación:

```text
POST /auth/register
POST /auth/login
```

Citas:

```text
POST   /appointments
GET    /appointments
PATCH  /appointments/:id/cancel
```

Consultas clínicas, sólo ADMIN:

```text
POST   /consultations
GET    /consultations
GET    /consultations/:id
PATCH  /consultations/:id
DELETE /consultations/:id
```

## 10. Turnstile en desarrollo

Cloudflare Turnstile es opcional en desarrollo.

Si no configuras:

```text
TURNSTILE_SECRET_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

los formularios funcionan sin el widget.

Para activar Turnstile localmente:

```powershell
$env:TURNSTILE_SECRET_KEY="clave-secreta-de-turnstile"
$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY="site-key-publica-de-turnstile"
docker compose up --build -d
```

No publiques ninguna clave secreta.

## 11. Ver logs

Todos los servicios:

```powershell
docker compose logs -f
```

Sólo backend:

```powershell
docker compose logs -f backend
```

Sólo frontend:

```powershell
docker compose logs -f frontend
```

Sólo MongoDB:

```powershell
docker compose logs -f mongo
```

Salir de los logs:

```text
Ctrl + C
```

## 12. Reiniciar el sistema

Reiniciar contenedores sin reconstruir:

```powershell
docker compose restart
```

Recrear el backend después de cambiar variables:

```powershell
docker compose up -d --force-recreate backend
```

Reconstruir todo después de cambios de código:

```powershell
docker compose up --build -d
```

## 13. Detener el sistema

Detener contenedores conservando datos MongoDB:

```powershell
docker compose down
```

Detener y eliminar también el volumen MongoDB:

```powershell
docker compose down -v
```

Advertencia: `docker compose down -v` elimina la base de datos local y todas las citas/usuarios guardados.

## 14. Problemas comunes

### El frontend no abre

Comprueba:

```powershell
docker compose ps
docker compose logs frontend
```

La URL correcta es:

```text
http://localhost:3001
```

### El backend no responde

Comprueba:

```powershell
docker compose logs backend
```

La URL correcta es:

```text
http://localhost:3000
```

### MongoDB aparece unhealthy

Comprueba:

```powershell
docker compose logs mongo
docker compose ps
```

Durante el primer arranque puede tardar unos segundos en quedar `healthy`.

### El ADMIN no puede iniciar sesión

Comprueba que las variables existan en la misma terminal:

```powershell
$env:ADMIN_EMAIL
$env:ADMIN_NAME
```

La contraseña no se debe imprimir en la terminal ni compartir.

Si el usuario ADMIN ya existe, cambiar la variable `ADMIN_PASSWORD` no cambia automáticamente su contraseña.

Para crear un ADMIN completamente nuevo puedes usar otro correo.

### Se perdió la base local

Revisa si ejecutaste:

```powershell
docker compose down -v
```

Ese comando elimina el volumen `mongo_data`.

## 15. Comprobación rápida por PowerShell

Backend:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000
```

Swagger:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/docs
```

Frontend:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3001
```

Las tres rutas deberían responder con HTTP `200` cuando los servicios estén iniciados.

## 16. Comprobación de calidad del código

Backend:

```powershell
Set-Location backend-michelle
npm run build
npm test -- --runInBand --coverage
```

Frontend:

```powershell
Set-Location ..\web-michelle
npm run lint
npm run build
```

Volver a la raiz:

```powershell
Set-Location ..
```

## 17. Resumen de la arquitectura local

```text
Navegador
   |
   v
Next.js frontend :3001
   |
   v
NestJS REST API :3000
   |
   v
MongoDB interno :27017
```

La autenticación utiliza JWT. Las citas se asocian al usuario autenticado. La nutricionista accede a la agenda mediante una cuenta ADMIN provisionada por variables de entorno.

Esta rama es la versión de arquitectura monolito ejecutada con Docker Compose. No requiere Coolify ni un servidor Ubuntu para probarla localmente.
