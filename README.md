# Poli-ERP — Sistema de Gestión Integral Policonsultorio UNIOR

Monorepo del sistema de gestión para el Policonsultorio UNIOR. Cubre pacientes, citas, historia clínica electrónica (HCE), facturación, caja OPD, inventario, farmacia, laboratorio, seguros y reportes.

## Stack

- **Backend:** NestJS 10 (TypeScript) · Prisma 6 · PostgreSQL · JWT + Passport · Swagger · helmet + Throttler · WebSockets (Socket.io) para OPD en tiempo real
- **Frontend:** Next.js 14 (App Router) · React 18 · Tailwind CSS · TypeScript
- **Tooling:** pnpm 9 workspaces · Turborepo · dotenv-cli
- **Sin Docker** — todo corre sobre Postgres local gestionado por pgAdmin

## Estructura

```
poli-erp/
├── apps/
│   ├── api/                        # Backend NestJS (puerto 3001)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/            # 19 módulos de dominio
│   │   │   │   ├── auth/                  login, JWT, refresh, change-password, forgot/reset
│   │   │   │   ├── patients/              CRUD + timeline + sub-recursos
│   │   │   │   ├── appointments/          crear, reagendar, cancelar, check-in, disponibilidad
│   │   │   │   ├── medical-records/       CRUD con versionado, CIE-10, firma
│   │   │   │   ├── billing/               facturas, items, pagos, cancelación
│   │   │   │   ├── cash-sessions/         apertura, cierre, arqueo, reporte
│   │   │   │   ├── queue/                 gateway WebSocket + endpoints REST
│   │   │   │   ├── users/                 CRUD + especialidades + horarios
│   │   │   │   ├── specialties/           CRUD
│   │   │   │   ├── rooms/                 CRUD consultorios
│   │   │   │   ├── holidays/              feriados nacionales/clínica
│   │   │   │   ├── cie10/                 catálogo CIE-10 + búsqueda
│   │   │   │   ├── insurance/             aseguradoras, acuerdos, paciente-aseguradora
│   │   │   │   ├── documents/             documentos del paciente
│   │   │   │   ├── prescriptions/         recetas electrónicas + dispensación
│   │   │   │   ├── lab-orders/            órdenes de laboratorio + resultados
│   │   │   │   ├── service-catalog/       catálogo de servicios facturables
│   │   │   │   ├── inventory/             productos, lotes, movimientos, proveedores
│   │   │   │   └── reports/               dashboard, financiero, clínico, productividad
│   │   │   └── shared/             # decoradores, guards, audit, filter, prisma, etc.
│   │   └── test/                   # tests E2E
│   └── web/                        # Frontend Next.js (puerto 3000)
│       ├── src/app/
│       │   ├── (auth)/login/             # /login
│       │   └── (dashboard)/              # protegidas por middleware
│       │       ├── dashboard/
│       │       ├── patients/             # lista + [id]
│       │       ├── appointments/         # + tabs (Hoy, Todas, OPD, Consultorios)
│       │       ├── medical-records/      # lista + [id] con tabs
│       │       ├── billing/              # facturas + caja
│       │       ├── inventory/
│       │       ├── queue/                # pantalla OPD en vivo
│       │       ├── reports/
│       │       └── settings/             # perfil + gestión de usuarios
│       ├── src/components/layout/         # sidebar, header
│       ├── src/hooks/useAuth.ts           # sincroniza token con cookie
│       ├── src/lib/api/client.ts          # cliente API con refresh + tipos
│       ├── src/lib/format.ts              # formatCurrency, formatDate, statusColor, etc.
│       └── src/middleware.ts              # protege rutas del dashboard
├── packages/
│   ├── database/                  # Prisma schema, migraciones, seed
│   └── shared/                    # tipos y enums compartidos
├── pnpm-workspace.yaml
├── turbo.json
└── .env / .env.example
```

## Requisitos

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- PostgreSQL 15+ corriendo localmente (gestionado con pgAdmin)

## Inicio rápido

```bash
# 1. Crear BD "poli-erp" en pgAdmin (Server: localhost:5432 / Usuario: postgres)

# 2. Activar pnpm y clonar/entrar al proyecto
corepack enable
corepack prepare pnpm@9.15.4 --activate

# 3. Instalar dependencias
pnpm install

# 4. Configurar variables de entorno (ajusta DATABASE_URL con tus credenciales)
cp .env.example .env

# 5. Generar cliente Prisma + crear migración inicial + seed
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed

# 6. Arrancar API + Web en paralelo
pnpm dev
```

## URLs

| Servicio       | URL                              |
|----------------|----------------------------------|
| Frontend       | http://localhost:3000            |
| API REST       | http://localhost:3001/api        |
| Swagger / docs | http://localhost:3001/api/docs   |
| Health check   | http://localhost:3001/api/health |
| Prisma Studio  | `pnpm db:studio`                 |

## Credenciales seed (desarrollo)

| Rol              | Email                  | Contraseña    |
|------------------|------------------------|---------------|
| Super Admin      | admin@unior.local      | Admin123!     |
| Administrador    | admin2@unior.local     | Admin123!     |
| Doctor           | doctor@unior.local     | Doctor123!    |
| Enfermera        | enfermera@unior.local  | Enferm123!    |
| Recepción        | recepcion@unior.local  | Recep123!     |
| Contable         | contable@unior.local   | Conta123!     |
| Farmacia         | farmacia@unior.local   | Farma123!     |
| Laboratorio      | lab@unior.local        | Lab123!       |

## Scripts

| Script                     | Descripción                                       |
|----------------------------|---------------------------------------------------|
| `pnpm dev`                 | Inicia API + Web en paralelo                      |
| `pnpm build`               | Compila todos los paquetes                        |
| `pnpm lint`                | Lint de todos los paquetes                        |
| `pnpm test`                | Tests unitarios del backend (jest)                |
| `pnpm --filter api test:e2e` | Tests E2E con Supertest                         |
| `pnpm db:generate`         | Genera el cliente Prisma                          |
| `pnpm db:migrate`          | Crea/aplica migraciones en desarrollo             |
| `pnpm db:migrate:deploy`   | Aplica migraciones en producción                  |
| `pnpm db:seed`             | Datos iniciales (clínica + 8 usuarios + catálogos) |
| `pnpm db:studio`           | UI Prisma para inspeccionar la BD                 |
| `pnpm db:reset`            | ⚠️  Resetea toda la BD                            |
| `pnpm clean`               | Limpia builds, turbo cache, node_modules          |

## Arquitectura técnica

### Backend (NestJS)

- **Multi-tenancy** (`clinicId` en entidades clínicas) — preparado para varias sedes
- **RBAC granular** — tabla `Permission` + `RolePermission` cargada en el JWT
- **Auditoría** — `AuditService` registra toda mutación sensible (HCE, pacientes, usuarios, facturación)
- **Borrado lógico** (`isActive`, `deletedAt`) en pacientes, HCE, facturas, usuarios
- **Versionado HCE** — tabla `MedicalRecordVersion` con snapshot por edición
- **CIE-10** catálogo independiente (no se guarda sólo texto libre)
- **Numeración secuencial** de facturas (`FAC-YYYY-NNNNNN`)
- **Numeración con cero collisions** validado en Prisma unique
- **Soft queue** — la cola OPD vive como filas en `QueueEntry`, no como cache
- **Tiempo real** vía `@WebSocketGateway('queue')` con namespace `/queue` (compatible con Socket.io)
- **Helmet, Throttler, class-validator, ValidationPipe global, ClassSerializerInterceptor, ExceptionFilter global, Logging HTTP**

### Frontend (Next.js)

- **App Router** con grupos `(auth)` y `(dashboard)`
- **Middleware** protege todas las rutas del dashboard (basado en cookie sincronizada con el token JWT)
- **Cookie `poli_auth`** sincronizada con `localStorage` para que el middleware del Edge pueda leerla
- **Refresh automático** del access token cuando expira (interceptor en `api` client)
- **Polling** cada 5 s en cola OPD y resumen del día
- **Tailwind** con paleta `primary` (azul) — fácil de customizar

## Endpoints (resumen)

> Documentación completa Swagger en `http://localhost:3001/api/docs`

```
POST   /api/auth/login            POST   /api/auth/refresh-token
POST   /api/auth/logout           GET    /api/auth/me
POST   /api/auth/change-password  POST   /api/auth/forgot-password

GET    /api/patients              POST   /api/patients
GET    /api/patients/:id          PUT    /api/patients/:id
PATCH  /api/patients/:id/deactivate        # borrado lógico
GET    /api/patients/:id/timeline
GET    /api/patients/:id/medical-records
GET    /api/patients/:id/appointments
GET    /api/patients/:id/billing

POST   /api/appointments          GET    /api/appointments
GET    /api/appointments/today    GET    /api/appointments/waiting-list
GET    /api/appointments/availability?doctorId=&date=
PUT    /api/appointments/:id
POST   /api/appointments/:id/cancel
POST   /api/appointments/:id/reschedule
POST   /api/appointments/:id/check-in       # OPD
POST   /api/appointments/:id/confirm

GET    /api/queue                 POST   /api/queue/:id/call
GET    /api/queue/occupancy       POST   /api/queue/:id/complete
                                   POST   /api/queue/:id/no-show

POST   /api/medical-records       GET    /api/medical-records
GET    /api/medical-records/:id   PUT    /api/medical-records/:id
GET    /api/medical-records/patient/:patientId
GET    /api/medical-records/:id/versions
PATCH  /api/medical-records/:id/sign
PATCH  /api/medical-records/:id/deactivate

POST   /api/billing               GET    /api/billing
GET    /api/billing/:id           PUT    /api/billing/:id
POST   /api/billing/:id/pay       POST   /api/billing/:id/cancel
GET    /api/billing/invoice/:number

POST   /api/cash-sessions/open    GET    /api/cash-sessions
POST   /api/cash-sessions/:id/close
GET    /api/cash-sessions/:id/report
GET    /api/cash-sessions/active  GET    /api/cash-sessions/cash-registers

GET    /api/prescriptions         POST   /api/prescriptions
POST   /api/prescriptions/:id/dispense

GET    /api/lab-orders            POST   /api/lab-orders
GET    /api/lab-orders/pending    POST   /api/lab-orders/:id/results
GET    /api/lab-orders/exam-types

GET    /api/service-catalog       POST   /api/service-catalog
PUT    /api/service-catalog/:id

GET    /api/inventory/products    POST   /api/inventory/products
GET    /api/inventory/products/low-stock
GET    /api/inventory/products/expiring?days=30
POST   /api/inventory/movements   POST   /api/inventory/batches
GET    /api/inventory/suppliers   POST   /api/inventory/suppliers

GET    /api/insurance/providers   POST   /api/insurance/providers
GET    /api/insurance/patients/:patientId
POST   /api/insurance/patients/:patientId

GET    /api/specialties           POST   /api/specialties
GET    /api/rooms                 POST   /api/rooms
GET    /api/holidays?year=2026    POST   /api/holidays
GET    /api/cie10?search=J06      GET    /api/cie10/search?q=
GET    /api/users                 POST   /api/users
GET    /api/users/doctors         PUT    /api/users/:id
PATCH  /api/users/:id/activate    PATCH  /api/users/:id/deactivate
POST   /api/users/:id/specialties POST   /api/users/:id/schedules
GET    /api/documents/patient/:patientId

GET    /api/reports/dashboard     GET    /api/reports/financial?start=&end=
GET    /api/reports/appointments/by-date    GET    /api/reports/doctors/productivity
GET    /api/reports/clinical?start=&end=
```

## Flujo crítico (MVP)

```
1. Admin crea clínica, especialidades, consultorios y catálogo de servicios
2. Recepción registra paciente
3. Recepción agenda cita (verifica disponibilidad de médico y consultorio)
4. Paciente llega → Check-in OPD → turno automático
5. Doctor llama siguiente (queue:call) → atiende
6. Doctor crea historia clínica con signos vitales, antecedentes, diagnósticos CIE-10
7. Doctor crea prescripción (opcional) o orden de laboratorio (opcional)
8. Sistema/secretaria genera factura con ítems del catálogo
9. Paciente paga (efectivo/tarjeta/transferencia/seguro) — sesión de caja
10. Al cerrar caja, arqueo automático con diferencia
```

## Seguridad

- Contraseñas hasheadas con `bcrypt` (cost 12)
- JWT con expiración corta + refresh tokens persistidos (revocables)
- Helmet en headers HTTP
- Throttler global (100 req/min por IP, ajustables vía env)
- Throttle reforzado en `/auth/login` y `/auth/forgot-password`
- RBAC: el `PermissionsGuard` rechaza requests sin permiso; ver `audit`
- CORS restrictivo (`CORS_ORIGIN` por env)
- `forbidNonWhitelisted: true` en el `ValidationPipe` global
- `@Public()` decorator por endpoint para excepciones explícitas

## Roadmap

- [ ] Notificaciones Twilio/SendGrid (recordatorios SMS/email) — stubs ya listos en `.env`
- [ ] Subida de documentos a S3 (`@nestjs/platform-storage` o `aws-sdk`)
- [ ] Reportes con exportación real Excel/PDF (`exceljs` + `pdfkit`)
- [ ] Búsqueda global transversal (pacientes/citas/HCE)
- [ ] Módulo de contabilidad (libro diario, plan de cuentas)
- [ ] Telemedicina (videollamadas)
- [ ] Tests E2E adicionales (Playwright en web, más Supertest en API)
- [ ] CI/CD (GitHub Actions para lint + build + tests)

## Stack

| Capa | Tecnología | Versión |
|------|------------|---------|
| Backend | NestJS | 10.4.x |
| ORM | Prisma | 6.1.x |
| DB | PostgreSQL | 15+ |
| Auth | JWT (passport-jwt) | — |
| Realtime | Socket.io | 4.x |
| Frontend | Next.js | 14.2.x |
| UI | Tailwind CSS | 3.4.x |
| Build tooling | Turborepo | 2.3.x |
| Package manager | pnpm | 9.15.x |

Ver [SPECS.md](./SPECS.md) para la especificación completa de requisitos.
