# Proyecto Michelle

Sistema monolito para gestión de consultas nutricionales. El proyecto cumple el stack inscrito: Next.js, NestJS, API REST, MongoDB y Swagger.

## Arquitectura

- `web-michelle`: frontend Next.js con App Router.
- `backend-michelle`: API REST NestJS.
- MongoDB: persistencia de usuarios, citas y consultas.
- Swagger: documentación disponible en `http://localhost:3000/docs`.
- Docker Compose: levanta frontend, backend y MongoDB como un monolito.

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

El workflow `.github/workflows/ci.yml` ejecuta build, tests y coverage del backend, además del build del frontend. El backend mantiene un umbral mínimo de 60%; la suite actual supera ese umbral.

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
