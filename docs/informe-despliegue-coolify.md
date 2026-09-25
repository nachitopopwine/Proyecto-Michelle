# Informe tecnico de despliegue en Coolify

## Estado de los cambios

El proyecto se trabaja en la rama `desarrollo-michelle`.

Los cambios actuales se mantendran localmente mientras terminan las pruebas. Posteriormente se subiran a la rama `desarrollo-michelle`. No se debe configurar Coolify desde GitHub hasta que esos cambios esten confirmados y publicados.

No se realizaron correcciones de codigo como parte de este informe.

## 1. Estructura relevante

```text
Proyecto Michelle/
├── docker-compose.yml
├── README.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend-michelle/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── auth/
│       ├── appointments/
│       ├── consultations/
│       └── calendar/
└── web-michelle/
    ├── Dockerfile
    ├── .dockerignore
    ├── .env.example
    ├── next.config.mjs
    ├── postcss.config.mjs
    ├── package.json
    ├── app/
    │   ├── layout.jsx
    │   └── page.jsx
    └── src/
        ├── App.jsx
        ├── index.css
        └── assets/
```

## 2. Docker Compose

Archivo: `docker-compose.yml`.

Servicios:

| Servicio | Configuracion | Puerto |
|---|---|---|
| `mongo` | Imagen `mongo:8` | Solo interno |
| `backend` | Construye `./backend-michelle` | `3000:3000` |
| `frontend` | Construye `./web-michelle` | `3001:3001` |

Compose crea una red privada por defecto. Los servicios se comunican mediante sus nombres:

```text
backend -> mongo:27017
frontend -> backend:3000
```

MongoDB utiliza el volumen:

```yaml
mongo_data:/data/db
```

MongoDB no publica el puerto `27017`, por lo tanto no queda expuesto publicamente.

Healthcheck de MongoDB:

```yaml
healthcheck:
  test: ["CMD", "mongosh", "--quiet", "--eval", "db.runCommand({ ping: 1 }).ok"]
```

Variables actuales del backend:

```yaml
PORT: 3000
MONGODB_URI: mongodb://mongo:27017/michelle
JWT_SECRET: ${JWT_SECRET:-change-this-secret}
FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3001}
```

El fallback de `JWT_SECRET` no debe utilizarse en produccion. Coolify debe recibir un valor secreto real.

En produccion Coolify puede gestionar los puertos mediante su proxy. Se recomienda asociar un dominio al frontend en el puerto interno `3001` y no exponer MongoDB.

## 3. Dockerfile del backend

Archivo: `backend-michelle/Dockerfile`.

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

El Dockerfile compila NestJS, instala dependencias de produccion y ejecuta `dist/main.js`. Es correcto como base para Coolify.

## 4. Backend NestJS

### Puerto

Archivo: `backend-michelle/src/main.ts`.

```ts
await app.listen(Number(process.env.PORT ?? 3000));
```

El puerto predeterminado es `3000`.

No se indica explicitamente un host. NestJS no esta configurado para escuchar exclusivamente en `localhost`; dentro de Docker debe quedar accesible mediante la interfaz de red del contenedor.

### CORS

Archivo: `backend-michelle/src/main.ts`.

```ts
app.enableCors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
});
```

En produccion:

```env
FRONTEND_URL=https://michelle.tudominio.cl
```

### JWT_SECRET

Archivo: `backend-michelle/src/auth/auth.module.ts`.

```ts
secret: process.env.JWT_SECRET || 'super_secreto_desarrollo'
```

Se utiliza para firmar tokens JWT y debe ser secreto.

Valor de produccion:

```text
XXXXXXXX
```

### MONGODB_URI

Archivo: `backend-michelle/src/app.module.ts`.

```ts
MongooseModule.forRoot(
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/michelle',
)
```

En Docker Compose se reemplaza por:

```text
mongodb://mongo:27017/michelle
```

El valor `localhost` solo corresponde al fallback local. Dentro de Docker debe utilizarse `mongo`.

### Swagger

Archivo: `backend-michelle/src/main.ts`.

```ts
const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('docs', app, swaggerDocument);
```

Ruta local:

```text
http://localhost:3000/docs
```

Ruta de produccion esperada:

```text
https://api.tudominio.cl/docs
```

### Endpoints

```text
GET     /
POST    /auth/register
POST    /auth/login
POST    /appointments
POST    /consultations
GET     /consultations
GET     /consultations/:id
PATCH   /consultations/:id
DELETE  /consultations/:id
```

### Health check

No existe un endpoint dedicado `/health`.

Existe `GET /`, que devuelve `Hello World!`, pero no es un health check completo.

## 5. Dockerfile del frontend

Archivo: `web-michelle/Dockerfile`.

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3001
CMD ["node", "server.js"]
```

La configuracion depende de:

```js
output: 'standalone'
```

en `web-michelle/next.config.mjs`.

El Dockerfile es compatible con Next.js standalone y ejecuta el frontend en el puerto `3001`.

## 6. Comunicacion Next.js con NestJS

### URL del backend

La unica definicion encontrada esta en:

```text
web-michelle/.env.example
```

Contenido:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Variables NEXT_PUBLIC_*

Solo existe:

```text
NEXT_PUBLIC_API_URL
```

No se encontraron referencias funcionales a esta variable en los componentes.

Tampoco se encontraron llamadas mediante:

```text
fetch
axios
```

Por lo tanto, el frontend actual no esta consumiendo realmente el backend. Parte de la interfaz utiliza datos simulados.

### Build y runtime

Actualmente `NEXT_PUBLIC_API_URL` no se utiliza ni en build ni en runtime porque no aparece referenciada en el codigo.

Si posteriormente se usa dentro de un componente cliente, su valor debe estar disponible durante el build de Next.js:

```env
NEXT_PUBLIC_API_URL=https://api.tudominio.cl
```

### Cloudflare

Con frontend y backend separados:

```text
Frontend: https://michelle.tudominio.cl
Backend:  https://api.tudominio.cl
```

La URL del frontend debe configurarse como:

```env
NEXT_PUBLIC_API_URL=https://api.tudominio.cl
```

El backend debe permitir el frontend mediante:

```env
FRONTEND_URL=https://michelle.tudominio.cl
```

## 7. MongoDB

Configuracion actual:

```yaml
image: mongo:8
```

Persistencia:

```yaml
volumes:
  - mongo_data:/data/db
```

MongoDB no tiene puerto publico configurado.

No existen credenciales de MongoDB configuradas. Para produccion se recomienda:

- crear usuario y contraseña;
- usar una URI con credenciales;
- guardar la URI como secreto en Coolify;
- no publicar el puerto `27017`;
- configurar backups del volumen.

## 8. GitHub Actions

Archivo: `.github/workflows/ci.yml`.

Backend:

```text
npm ci
npm run build
npm test -- --runInBand --coverage
```

Frontend:

```text
npm ci
npm run build
```

El workflow ejecuta tests y coverage del backend y build del frontend.

Actualmente no:

- construye imagenes Docker;
- ejecuta despliegue automatico;
- configura Coolify;
- utiliza secretos de GitHub.

El workflow debe estar confirmado y subido a GitHub para ejecutarse realmente.

## 9. Variables de entorno

| Variable | Servicio | Uso | Secreta | Local | Produccion |
|---|---|---|---|---|---|
| `PORT` | Backend | Puerto NestJS | No | `3000` | `3000` |
| `MONGODB_URI` | Backend | Conexion MongoDB | Si | `mongodb://localhost:27017/michelle` | `XXXXXXXX` |
| `JWT_SECRET` | Backend | Firma JWT | Si | `change-this-secret` | `XXXXXXXX` |
| `FRONTEND_URL` | Backend | CORS | No | `http://localhost:3001` | `https://michelle.tudominio.cl` |
| `MONGO_INITDB_DATABASE` | MongoDB | Base inicial | No | `michelle` | `michelle` |
| `NEXT_PUBLIC_API_URL` | Frontend | URL publica de API | No | `http://localhost:3000` | `https://api.tudominio.cl` |
| `PORT` | Frontend | Puerto Next.js | No | `3001` | `3001` |

No se muestran secretos reales.

## 10. Configuracion recomendada en Coolify

Repositorio:

```text
https://github.com/nachitopopwine/Proyecto-Michelle
```

Rama:

```text
desarrollo-michelle
```

Archivo Compose:

```text
docker-compose.yml
```

Servicios:

```text
mongo
backend
frontend
```

Frontend:

```text
Puerto interno: 3001
Dominio: https://michelle.tudominio.cl
```

Backend:

```text
Puerto interno: 3000
Dominio opcional: https://api.tudominio.cl
```

MongoDB:

```text
Sin dominio publico
Sin puerto publico
Con volumen persistente
```

Variables que deben configurarse en Coolify:

```env
PORT=3000
MONGODB_URI=XXXXXXXX
JWT_SECRET=XXXXXXXX
FRONTEND_URL=https://michelle.tudominio.cl
```

Si el frontend utiliza realmente la API:

```env
NEXT_PUBLIC_API_URL=https://api.tudominio.cl
```

## 11. Cloudflare Tunnel

### Tunnel persistente

Requiere:

- cuenta Cloudflare;
- dominio propio;
- `cloudflared`;
- tunnel nombrado;
- hostname DNS;
- servicio ejecutandose permanentemente.

Si `cloudflared` corre directamente en Ubuntu:

```text
http://127.0.0.1:3001
```

Si corre como contenedor dentro de Compose:

```text
http://frontend:3001
```

### Quick Tunnel

Comando temporal:

```bash
cloudflared tunnel --url http://localhost:3001
```

Limitaciones:

- URL temporal;
- puede cambiar;
- no es ideal para produccion;
- depende del proceso activo;
- no utiliza dominio propio.

## 12. Riesgos

- Cambios locales no publicados en GitHub.
- Uso de localhost como fallback.
- `NEXT_PUBLIC_API_URL` no esta siendo utilizado.
- Frontend aun no consume realmente la API.
- CORS debe cambiar a la URL HTTPS real.
- `JWT_SECRET` posee fallback inseguro.
- MongoDB no utiliza autenticacion.
- No existe health check dedicado del backend.
- No existe backup automatico de MongoDB.
- Los nombres de servicio Docker deben usarse para comunicacion interna.
- Coolify puede administrar puertos mediante su proxy.
- Quick Tunnel no es una solucion permanente.
- HTTPS debe estar activo en la URL publica.
- `@nestjs/mongoose` aparece en version 12 mientras NestJS esta en version 11; se debe verificar compatibilidad antes de produccion.

## 13. Cambios minimos necesarios antes de produccion

No se realizaron estos cambios. Solo se identifican:

1. Confirmar los cambios locales.
2. Subir Docker Compose, Dockerfiles y workflow a `desarrollo-michelle`.
3. Configurar secretos reales en Coolify.
4. Cambiar `FRONTEND_URL` a la URL HTTPS real.
5. Configurar `MONGODB_URI` de produccion.
6. Configurar `NEXT_PUBLIC_API_URL` si se conecta el frontend.
7. Verificar la compatibilidad de `@nestjs/mongoose` con NestJS 11.
8. Agregar health check si Coolify lo requiere.
9. Configurar backups de MongoDB.
10. Probar la URL publica desde otra red.

# BACKEND READY FOR COOLIFY

```text
BACKEND READY FOR COOLIFY: NO
```

El Dockerfile del backend funciona como base, pero el backend aun no esta listo para produccion por estas razones:

1. Los cambios actuales aun no estan confirmados ni publicados en GitHub.
2. `JWT_SECRET` tiene un fallback inseguro.
3. MongoDB no tiene autenticacion configurada.
4. No existe endpoint dedicado `/health`.
5. No existe healthcheck Docker para backend.
6. La version de `@nestjs/mongoose` debe verificarse contra NestJS 11.
7. El frontend no consume aun realmente el backend.
8. No existe una estrategia de backup para MongoDB.

# CHECKLIST PREVIO A COOLIFY

## Codigo

- [ ] Confirmar Next.js.
- [ ] Confirmar NestJS.
- [ ] Confirmar compatibilidad de `@nestjs/mongoose`.
- [ ] Confirmar Swagger.
- [ ] Conectar frontend con backend.
- [ ] Probar registro.
- [ ] Probar login.
- [ ] Probar citas.
- [ ] Probar consultas.

## GitHub

- [ ] Revisar cambios locales.
- [ ] Confirmar archivos Docker.
- [ ] Confirmar `docker-compose.yml`.
- [ ] Confirmar GitHub Actions.
- [ ] Hacer commit en `desarrollo-michelle`.
- [ ] Hacer push a GitHub.
- [ ] Confirmar que Coolify ve los archivos nuevos.

## Docker

- [ ] Ejecutar `docker compose config`.
- [ ] Ejecutar `docker compose build`.
- [ ] Ejecutar `docker compose up`.
- [ ] Confirmar MongoDB saludable.
- [ ] Confirmar frontend.
- [ ] Confirmar backend.
- [ ] Confirmar Swagger.
- [ ] No publicar MongoDB.

## Coolify

- [ ] Tener Ubuntu Server 22.04.
- [ ] Tener acceso SSH.
- [ ] Tener IP del servidor.
- [ ] Instalar Docker.
- [ ] Instalar Coolify Self-hosted.
- [ ] Conectar GitHub.
- [ ] Seleccionar `desarrollo-michelle`.
- [ ] Seleccionar `docker-compose.yml`.
- [ ] Configurar variables.
- [ ] Configurar volumen MongoDB.
- [ ] Configurar dominio frontend.
- [ ] Revisar logs.

## Cloudflare

- [ ] Crear cuenta Cloudflare.
- [ ] Tener dominio o decidir usar Quick Tunnel.
- [ ] Configurar Tunnel persistente.
- [ ] Configurar hostname.
- [ ] Apuntar al frontend.
- [ ] Configurar HTTPS.
- [ ] Probar desde otra red.
- [ ] Documentar limitaciones del Quick Tunnel.

## Demostracion

- [ ] Mostrar Ubuntu encendido.
- [ ] Mostrar IP del servidor.
- [ ] Mostrar Coolify.
- [ ] Mostrar servicios desplegados.
- [ ] Mostrar logs.
- [ ] Mostrar MongoDB y su volumen.
- [ ] Mostrar URL publica.
- [ ] Abrir frontend desde Internet.
- [ ] Mostrar Swagger.
- [ ] Explicar Cloudflare.
- [ ] Explicar limitaciones, seguridad y costos.
