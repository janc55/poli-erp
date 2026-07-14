# SPECS.md — Sistema de Gestión para Policonsultorio UNIOR

> **Versión:** 1.0 · **Estado:** Borrador de especificación · **Última revisión:** Junio 2026

## Tabla de contenidos

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Requerimientos Funcionales por Módulo](#2-requerimientos-funcionales-por-módulo)
3. [Requerimientos No Funcionales](#3-requerimientos-no-funcionales)
4. [Arquitectura Técnica](#4-arquitectura-técnica)
5. [Interfaz de Usuario](#5-interfaz-de-usuario)
6. [Seguridad y Buenas Prácticas](#6-seguridad-y-buenas-prácticas)
7. [Plan de Implementación](#7-plan-de-implementación)
8. [Consideraciones de Despliegue](#8-consideraciones-de-despliegue)
9. [Documentación y Entregables](#9-documentación-y-entregables)
10. [Métricas de Éxito](#10-métricas-de-éxito)
11. [Riesgos y Mitigación](#11-riesgos-y-mitigación)
12. [Conclusión](#12-conclusión)
- [Apéndice A: Notas de Revisión Técnica](#apéndice-a-notas-de-revisión-técnica)

---

## 1. Visión General del Proyecto

### 1.1 Objetivo

Desarrollar un Sistema de Gestión Integral para el Policonsultorio UNIOR que permita administrar eficientemente todas las operaciones clínicas, administrativas y financieras, mejorando la calidad de atención y optimizando los recursos del centro médico.

### 1.2 Alcance

Sistema **MVP** (Producto Mínimo Viable) completo y funcional que cubra todos los módulos esenciales para la operación de un policonsultorio de mediana complejidad, con capacidad de escalar según las necesidades del centro.

> **Nota de alcance:** Las funcionalidades marcadas como *Próximamente* o *Opcional* quedan fuera del MVP inicial. Ver [Apéndice A](#apéndice-a-notas-de-revisión-técnica) para priorización recomendada.

### 1.3 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Backend** | NestJS (TypeScript), arquitectura modular |
| **Frontend** | Next.js 14+ (App Router), TypeScript |
| **Base de datos** | PostgreSQL + Prisma ORM |
| **Autenticación** | JWT (NestJS) + NextAuth.js (frontend) |
| **Almacenamiento** | AWS S3 o similar (imágenes/documentos) |
| **Notificaciones** | Twilio (SMS/WhatsApp) + SendGrid (Email) |
| **Reportes** | PDFKit / ExcelJS *(JasperReports solo si se requiere integración Java)* |
| **Estado global** | Zustand + React Query (TanStack Query) |
| **UI** | Tailwind CSS + Shadcn/ui |
| **Cache / tiempo real** | Redis + WebSockets (cola de espera OPD) |

---

## 2. Requerimientos Funcionales por Módulo

### 2.1 Módulo de Gestión de Pacientes

#### 2.1.1 Registro de Pacientes

**Campos obligatorios:**

| Campo | Descripción |
|-------|-------------|
| Identificación | DNI/Cédula (único, validado) |
| Nombres y apellidos | Completos |
| Fecha de nacimiento | Con cálculo automático de edad |
| Género | Masculino / Femenino / Otro |
| Estado civil | Soltero / Casado / Divorciado / Viudo / Unión libre |
| Nacionalidad | — |
| Ocupación | — |
| Contacto | Teléfono principal, secundario, email |
| Dirección | Calle, número, ciudad, provincia, código postal |
| Contacto de emergencia | Nombre, relación, teléfono |
| Grupo sanguíneo | Opcional |
| Alergias conocidas | Texto libre, opcional |
| Enfermedades crónicas | Texto libre, opcional |
| Observaciones generales | — |

**Funcionalidades:**

- Búsqueda por DNI, nombre, apellido y teléfono
- Registro rápido con validación de datos
- Historial de visitas
- Módulo de fidelización (puntos por visitas) — *Próximamente*
- Gestión de pacientes frecuentes

#### 2.1.2 Admisión y Control de Flujo (OPD)

**Funcionalidades:**

- Registro de llegada de pacientes (check-in)
- Asignación automática de número de turno
- Visualización de pacientes en espera por especialidad
- Estado en tiempo real: `Esperando` / `En consulta` / `Finalizado` / `No asistió`
- Tiempo de espera estimado
- Dashboard de ocupación por consultorio

#### 2.1.3 Gestión de Documentos

- Subida de documentos: DNI, fotos, resultados previos
- Almacenamiento seguro con acceso controlado
- Asociación de documentos a historias clínicas

---

### 2.2 Módulo de Agenda y Citas Médicas

#### 2.2.1 Configuración de Agenda

**Funcionalidades:**

- Horarios por médico y especialidad
- Duración de consultas configurable (15, 30, 45, 60 min)
- Días hábiles por médico
- Intervalos de atención (ej. 8:00–13:00, 15:00–20:00)
- Pausas programadas (almuerzo, descansos)
- Días festivos y feriados

#### 2.2.2 Gestión de Citas

**Funcionalidades:**

- Creación de citas (presencial, telemedicina)
- Verificación de disponibilidad en tiempo real
- Doble verificación de disponibilidad de consultorio
- Gestión de sobrecupos
- Asignación automática de consultorio
- Cancelaciones con registro de motivo
- Reprogramación con historial de cambios
- Lista de espera con notificación automática
- Citación masiva por campañas — *Próximamente*

#### 2.2.3 Recordatorios Automáticos

**Funcionalidades:**

- Envío automático 24 h antes
- Envío automático 1 h antes
- Recordatorios personalizados
- Confirmación de asistencia (response tracking)
- Gestión de no-show (notificación y seguimiento)

---

### 2.3 Módulo de Historias Clínicas Electrónicas (HCE)

#### 2.3.1 Estructura de Historia Clínica

**Secciones obligatorias:**

- Datos del paciente (sincronizado con módulo de pacientes)
- Motivo de consulta
- Anamnesis (historia de enfermedad actual)
- Antecedentes: personales, familiares, alergias, medicamentos
- Examen físico: signos vitales, exploración por sistemas
- Diagnósticos (CIE-10)
- Plan de tratamiento
- Prescripciones (integración con farmacia)
- Exámenes solicitados (integración con laboratorio)
- Evoluciones
- Notas médicas
- Consentimientos informados

#### 2.3.2 Funcionalidades de HCE

- Editor enriquecido (Markdown / rich text)
- Plantillas por especialidad (variables dinámicas)
- Firma digital del médico
- Impresión de informes
- Historial de versiones con registro de cambios
- Búsqueda por diagnóstico, fecha y médico
- Exportación (PDF, XML)
- Acceso responsive desde dispositivos móviles

#### 2.3.3 Gestión de Recetas

- Receta electrónica con código QR
- Impresión de recetas
- Control de recetas caducadas
- Registro de dispensación (integración con farmacia)

---

### 2.4 Módulo de Facturación, Cobros y Caja

#### 2.4.1 Gestión de Facturación

**Funcionalidades:**

- Generación automática de facturas al finalizar consulta
- Facturación por servicio o paquete
- Múltiples formas de pago
- Convenios con aseguradoras
- Descuentos por convenios
- Cálculo de copagos
- Facturación electrónica (según normativa local — *definir jurisdicción*)
- Números de factura secuenciales
- Anulación de facturas con justificación

#### 2.4.2 Gestión de Cobros

**Funcionalidades:**

- Registro de pagos: efectivo, tarjeta, transferencia, seguro
- Control de caja diaria
- Apertura y cierre de caja
- Arqueos
- Cuentas por cobrar
- Planes de pago
- Recibos de pago
- Gestión de deudas y morosidad

#### 2.4.3 Integración con Módulos

| Origen | Genera |
|--------|--------|
| Cita | Factura |
| Examen | Factura |
| Prescripción | Factura |
| Paquete | Factura |

---

### 2.5 Módulo de Gestión de Personal y Usuarios

#### 2.5.1 Gestión de Personal

**Funcionalidades:**

- Registro de personal (médicos, enfermeras, administrativos)
- Datos personales y profesionales
- Títulos y especialidades
- Horarios y turnos
- Control de asistencia (check-in / check-out)
- Gestión de permisos y vacaciones
- Evaluación de desempeño — *Próximamente*
- Gestión de compensaciones

#### 2.5.2 Gestión de Roles y Permisos

**Roles predeterminados:**

| Rol | Descripción |
|-----|-------------|
| `SUPER_ADMIN` | Acceso total |
| `ADMIN` | Gestión administrativa |
| `DOCTOR` | HCE y agenda |
| `NURSE` | HCE y agenda |
| `RECEPTION` | Citas y pacientes |
| `ACCOUNTING` | Gestión financiera |
| `PHARMACY` | Farmacia |
| `LAB` | Laboratorio |
| `PATIENT` | Portal del paciente — *Próximamente* |

**Permisos granulares por módulo:** lectura, escritura, eliminación, exportación.

#### 2.5.3 Autenticación y Seguridad

- Login con DNI/email + contraseña
- Autenticación de dos factores (opcional)
- Sesión con JWT y refresh token
- Cierre de sesión automático por inactividad
- Política de contraseñas seguras
- Registro de accesos y auditoría

---

### 2.6 Módulo de Inventario y Farmacia / Suministros

#### 2.6.1 Gestión de Productos

**Categorías:**

- Medicamentos (genéricos, de marca, controlados)
- Insumos médicos
- Equipos
- Material de oficina

**Campos por producto:**

- Código único (generado automáticamente)
- Nombre, descripción, categoría
- Laboratorio / fabricante
- Presentación, concentración / dosis
- Unidad de medida
- Precio de compra y venta
- Stock mínimo y máximo
- Ubicación, lote, fecha de caducidad

**Funcionalidades:**

- Entrada y salida de inventario
- Ajustes y transferencias entre bodegas
- Alertas de stock bajo y producto caducado
- Control de medicamentos controlados
- Gestión de proveedores

#### 2.6.2 Gestión de Farmacia

- Dispensación de medicamentos
- Relación con recetas
- Inventario en tiempo real
- Kardex de productos
- Reportes de consumo
- Gestión de devoluciones

---

### 2.7 Módulo de Reportes y Estadísticas

#### 2.7.1 Reportes Administrativos

- Pacientes atendidos (diario / semanal / mensual)
- Ingresos por especialidad
- Productividad por médico
- Ocupación de consultorios
- Citas por médico
- No-show y cancelaciones

#### 2.7.2 Reportes Financieros

- Ingresos por forma de pago
- Cuentas por cobrar
- Facturación
- Caja diaria
- Convenios

#### 2.7.3 Reportes Clínicos

- Diagnósticos frecuentes (CIE-10)
- Medicamentos más prescritos
- Pacientes recurrentes

#### 2.7.4 Dashboards

- Administrativo
- Médico
- Financiero
- Operaciones (OPD / cola de espera)

#### 2.7.5 Exportación

- Excel, PDF, CSV, imagen
- Programación de reportes automáticos
- Envío por email

---

### 2.8 Módulos Adicionales (MVP ampliado / Fase 2)

> Estos módulos están descritos en el alcance general pero se recomienda priorizarlos después del núcleo operativo. Ver [Apéndice A](#apéndice-a-notas-de-revisión-técnica).

#### 2.8.1 Módulo de Laboratorio

- Gestión de exámenes (tipos, categorías)
- Solicitud desde HCE
- Registro de resultados y plantillas por tipo
- Entrega de resultados
- Reportes de laboratorio

#### 2.8.2 Módulo de Seguros y Convenios

- Gestión de aseguradoras y coberturas
- Verificación de cobertura en tiempo real
- Liquidaciones automáticas
- Control de copagos

#### 2.8.3 Módulo de Comunicación

- Recordatorios (SMS / email / WhatsApp)
- Notificaciones (citas, resultados)
- Portal del paciente — *Próximamente*
- Preferencias de comunicación por paciente

#### 2.8.4 Módulo de Contabilidad

- Libro diario
- Plan de cuentas
- Conciliaciones — *Próximamente*

#### 2.8.5 Módulo de Telemedicina *(Opcional)*

- Videoconsultas (Twilio / WebRTC)
- Citas virtuales
- Historial de videoconsultas

---

## 3. Requerimientos No Funcionales

### 3.1 Seguridad y Cumplimiento

- **Encriptación:** datos sensibles en reposo y en tránsito (TLS 1.2+)
- **Auditoría:** registro de acciones críticas (quién, qué, cuándo)
- **Backups:** automáticos diarios con prueba de restauración
- **Logs:** detallados para troubleshooting
- **Cumplimiento:** normativas locales de datos médicos (Ley 172-13 RD u equivalente)
- **Retención:** políticas de retención y borrado lógico (no `DELETE` físico en HCE)

### 3.2 Rendimiento

- Tiempo de carga < 3 segundos (páginas principales)
- Soporte para ~100 usuarios concurrentes *(ajustar según tamaño real del centro)*
- Consultas optimizadas e índices en tablas de búsqueda frecuente
- Caching con Redis para datos frecuentes
- Paginación en todos los listados

### 3.3 Usabilidad

- Interfaz intuitiva y responsive
- Accesibilidad WCAG 2.1 AA
- Soporte desktop, tablet y móvil
- Temas claro / oscuro
- Idioma español (configurable a futuro)

### 3.4 Escalabilidad

- Arquitectura modular
- Preparación para microservicios (monolito modular en MVP)
- Base de datos escalable verticalmente; réplicas de lectura a futuro
- Cache distribuido
- CDN para assets estáticos

### 3.5 Disponibilidad

- 99.9% uptime (objetivo)
- Estrategias de recuperación ante fallos
- Monitoreo y alertas (Sentry, health checks)

---

## 4. Arquitectura Técnica

### 4.1 Backend (NestJS)

```
src/
├── modules/
│   ├── auth/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   ├── patients/
│   ├── appointments/
│   ├── medical-records/
│   ├── billing/
│   ├── users/
│   ├── inventory/
│   ├── laboratory/          # Fase 2
│   ├── insurance/           # Fase 2
│   └── reports/
├── shared/
│   ├── config/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── utils/
├── database/
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── migrations/
└── main.ts
```

### 4.2 Frontend (Next.js)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── medical-records/
│   │   ├── billing/
│   │   ├── users/
│   │   ├── inventory/
│   │   └── reports/
│   ├── api/                 # Route handlers / proxy a NestJS si aplica
│   └── layout.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   └── charts/
├── hooks/
├── lib/
│   ├── api/
│   ├── utils/
│   └── validations/
├── store/
└── types/
```

### 4.3 Modelo de Datos (Prisma)

> **Borrador ilustrativo.** El esquema completo debe incluir entidades de cola OPD, consultorios, especialidades, caja, recetas, órdenes de laboratorio y enums alineados con los roles definidos en §2.5.2.

```prisma
// ─── Enums ───────────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  ADMIN
  DOCTOR
  NURSE
  RECEPTION
  ACCOUNTING
  PHARMACY
  LAB
  PATIENT
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum BillingStatus {
  PENDING
  PAID
  PARTIAL
  CANCELLED
}

// ─── Modelos principales ─────────────────────────────────

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  password       String
  firstName      String
  lastName       String
  dni            String    @unique
  phone          String?
  role           Role      @default(RECEPTION)
  isActive       Boolean   @default(true)
  lastLogin      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  appointments   Appointment[] @relation("Doctor")
  medicalRecords MedicalRecord[]
  audits         Audit[]
}

model Patient {
  id              String    @id @default(uuid())
  dni             String    @unique
  firstName       String
  lastName        String
  birthDate       DateTime
  gender          Gender
  phone           String
  email           String?
  allergies       String?
  chronicDiseases String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  appointments    Appointment[]
  medicalRecords  MedicalRecord[]
  billings        Billing[]
  documents       Document[]
}

model Appointment {
  id                 String            @id @default(uuid())
  patientId          String
  doctorId           String
  specialty          String
  dateTime           DateTime
  duration           Int               @default(30)
  status             AppointmentStatus @default(SCHEDULED)
  cancellationReason String?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  patient            Patient           @relation(fields: [patientId], references: [id])
  doctor             User              @relation("Doctor", fields: [doctorId], references: [id])
  billing            Billing?
  queueEntry         QueueEntry?
}

model MedicalRecord {
  id        String   @id @default(uuid())
  patientId String
  doctorId  String
  visitDate DateTime @default(now())
  reason    String?
  anamnesis String?
  diagnosis String?  // CIE-10 code + description
  treatment String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  patient   Patient  @relation(fields: [patientId], references: [id])
  doctor    User     @relation(fields: [doctorId], references: [id])
}

model Billing {
  id            String        @id @default(uuid())
  patientId     String
  appointmentId String?       @unique
  invoiceNumber String        @unique
  total         Decimal
  status        BillingStatus @default(PENDING)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  patient       Patient       @relation(fields: [patientId], references: [id])
  appointment   Appointment?  @relation(fields: [appointmentId], references: [id])
}

model QueueEntry {
  id            String   @id @default(uuid())
  appointmentId String   @unique
  turnNumber    Int
  specialty     String
  status        String   // WAITING | IN_CONSULTATION | DONE | NO_SHOW
  checkedInAt   DateTime @default(now())
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
}

model Document {
  id        String   @id @default(uuid())
  patientId String
  fileName  String
  fileUrl   String
  type      String
  createdAt DateTime @default(now())
  patient   Patient  @relation(fields: [patientId], references: [id])
}

model Audit {
  id        String   @id @default(uuid())
  userId    String
  action    String
  entity    String
  entityId  String?
  oldData   Json?
  newData   Json?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

### 4.4 API Endpoints Principales

#### Auth

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
POST   /api/auth/refresh-token
GET    /api/auth/me
POST   /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

#### Patients

```
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
PATCH  /api/patients/:id/deactivate    # Borrado lógico (no DELETE físico)
GET    /api/patients/search
GET    /api/patients/:id/medical-records
GET    /api/patients/:id/appointments
GET    /api/patients/:id/billing
```

#### Appointments

```
GET    /api/appointments
GET    /api/appointments/:id
POST   /api/appointments
PUT    /api/appointments/:id
POST   /api/appointments/:id/cancel
POST   /api/appointments/:id/reschedule
GET    /api/appointments/availability
GET    /api/appointments/doctor/:doctorId
GET    /api/appointments/waiting-list
POST   /api/appointments/:id/check-in   # OPD
```

#### Medical Records

```
GET    /api/medical-records
GET    /api/medical-records/:id
POST   /api/medical-records
PUT    /api/medical-records/:id
GET    /api/medical-records/patient/:patientId
POST   /api/medical-records/:id/prescription
POST   /api/medical-records/:id/lab-order
```

#### Billing

```
GET    /api/billing
GET    /api/billing/:id
POST   /api/billing
PUT    /api/billing/:id
POST   /api/billing/:id/pay
POST   /api/billing/:id/cancel
GET    /api/billing/invoice/:number
```

#### Users · Inventory · Reports

```
GET/POST/PUT  /api/users[...]
GET/POST/PUT  /api/inventory[...]
GET           /api/reports/dashboard
GET           /api/reports/{patients|appointments|billing|inventory|medical}
GET           /api/reports/export/:id
```

---

## 5. Interfaz de Usuario

### 5.1 Layout Principal

```
+------------------------------------------+
|  LOGO    |  Búsqueda Global  |  UserMenu  |
+----------+-------------------+------------+
|          |                                |
| Sidebar  |         Content Area           |
|          |                                |
| - Dashboard                              |
| - Patients                               |
| - Appointments                           |
| - Medical Records                        |
| - Billing                                |
| - Users                                  |
| - Inventory                              |
| - Reports                                |
| - Settings                               |
|          |                                |
+----------+--------------------------------+
|  Footer / Status Bar                      |
+------------------------------------------+
```

### 5.2 Componentes UI Reutilizables

| Componente | Descripción |
|------------|-------------|
| `DataTable` | Tabla con paginación, filtros y ordenamiento |
| `SearchBar` | Búsqueda global con autocompletado |
| `Modal` | Ventanas modales para acciones CRUD |
| `Form` | Formularios con validación y feedback |
| `Breadcrumb` | Navegación jerárquica |
| `Toast` | Notificaciones en tiempo real |
| `Loading` | Estados de carga |
| `DashboardCard` | Tarjetas de métricas |
| `Charts` | Gráficos (Recharts) |

---

## 6. Seguridad y Buenas Prácticas

### 6.1 Seguridad en Backend

- Validación de entrada: `class-validator` + sanitización
- Rate limiting contra fuerza bruta
- CORS restrictivo
- Helmet (headers de seguridad)
- JWT con expiración corta + refresh tokens
- Logs de auditoría en acciones críticas
- Contraseñas con `bcrypt`; datos sensibles con cifrado adicional si aplica

### 6.2 Seguridad en Frontend

- Protección de rutas (middleware Next.js + validación en API)
- Prevención XSS (escapado, CSP)
- Tokens en cookies `HttpOnly` / `Secure` / `SameSite`
- Validación de formularios con Zod

### 6.3 Prácticas de Desarrollo

- Tests: Jest (unit) + Supertest (integración)
- Linting: ESLint + Prettier
- Git hooks: Husky
- Documentación API: Swagger / OpenAPI
- Variables de entorno por ambiente
- Docker Compose para desarrollo local

---

## 7. Plan de Implementación

### Fase 1 — Setup y base *(Semanas 1–2)*

- [ ] Monorepo o repos separados (NestJS + Next.js)
- [ ] PostgreSQL + Prisma + migraciones iniciales
- [ ] Autenticación JWT + roles base
- [ ] Layout y componentes UI base

### Fase 2 — Módulos core *(Semanas 3–6)*

- [ ] Pacientes (CRUD + búsqueda)
- [ ] Agenda y citas
- [ ] HCE básica (sin firma digital en v1)
- [ ] Cola OPD / check-in

### Fase 3 — Operativos *(Semanas 7–9)*

- [ ] Facturación y cobros / caja
- [ ] Usuarios y permisos granulares
- [ ] Dashboard principal

### Fase 4 — Adicionales *(Semanas 10–14)*

- [ ] Inventario y farmacia
- [ ] Reportes y exportación
- [ ] Laboratorio y seguros *(si hay capacidad)*

### Fase 5 — Pruebas y despliegue *(Semanas 15–16)*

- [ ] Testing e2e de flujos críticos
- [ ] Optimización y auditoría de seguridad
- [ ] Documentación y despliegue staging → producción

> **Estimación realista:** el alcance original (14 semanas) es optimista para un equipo pequeño. Se recomienda 16–20 semanas o reducir alcance del MVP.

---

## 8. Consideraciones de Despliegue

### 8.1 Entornos

| Entorno | Descripción |
|---------|-------------|
| Development | Local con Docker Compose |
| Staging | Servidor de pruebas con datos anonimizados |
| Production | Servidor principal con backups y monitoreo |

### 8.2 Infraestructura Recomendada

| Componente | Opciones |
|------------|----------|
| Frontend | Vercel |
| Backend | AWS EC2 / DigitalOcean / Render |
| Base de datos | AWS RDS / Supabase |
| Almacenamiento | AWS S3 / Cloudinary |
| Cache | Redis (Upstash) |
| Logs / errores | Sentry |

### 8.3 CI/CD

- GitHub Actions o GitLab CI
- Tests automáticos en cada PR
- Despliegue automático a staging
- Despliegue manual a producción con aprobación

---

## 9. Documentación y Entregables

### 9.1 Documentación Técnica

- `README.md`
- API (Swagger / OpenAPI)
- Esquema de base de datos (Prisma + diagrama ER)
- Guía de despliegue
- Diagrama de arquitectura

### 9.2 Documentación de Usuario

- Manual de usuario por rol
- Guías de administración
- Troubleshooting

### 9.3 Entregables Finales

- Código fuente
- Base de datos con seed de prueba
- Scripts de migración
- Archivos de configuración de ejemplo (`.env.example`)
- Guía de instalación

---

## 10. Métricas de Éxito

### 10.1 Técnicas

- Tiempo de carga < 3 s
- 99.9% uptime
- 0 vulnerabilidades críticas abiertas
- ≥ 60% cobertura de tests en módulos core *(80% como objetivo a largo plazo)*

### 10.2 Operacionales

- Reducción del 40% en tiempo de espera percibido
- 100% de citas registradas en el sistema
- Recordatorios automáticos activos
- Reducción del 50% en errores administrativos

### 10.3 Comerciales

- Aumento en satisfacción del paciente
- Mejora en productividad médica
- Optimización de recursos
- Mejor control financiero

---

## 11. Riesgos y Mitigación

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Fallo en integración de módulos | Alto | Media | Arquitectura modular, contratos de API, tests de integración |
| Problemas de rendimiento | Alto | Media | Índices DB, Redis, benchmarks tempranos |
| Brecha de seguridad | Crítico | Baja | Auditorías, encriptación, principio de mínimo privilegio |
| Cambios en requisitos | Medio | Alta | Sprints cortos, backlog priorizado, MVP acotado |
| Adopción de usuarios | Medio | Media | Capacitación, UX simple, piloto con un consultorio |
| Alcance MVP demasiado amplio | Alto | Alta | Priorización por fases (ver Apéndice A) |
| Cumplimiento normativo médico | Crítico | Media | Asesoría legal, borrado lógico, auditoría HCE |

---

## 12. Conclusión

Este sistema de gestión para el Policonsultorio UNIOR está diseñado como una solución integral, segura y escalable que cubra las necesidades operativas, administrativas y financieras de un centro médico multiespecialidad.

La implementación por fases permite entregar valor temprano con un núcleo operativo (pacientes, citas, HCE, facturación) y extender gradualmente hacia farmacia, laboratorio, contabilidad y telemedicina según la capacidad del equipo y las prioridades del negocio.

---

## Apéndice A: Notas de Revisión Técnica

### A.1 Errores corregidos en este documento

| # | Problema | Corrección aplicada |
|---|----------|---------------------|
| 1 | Bloque Prisma sin cerrar (§4.3 absorbía §4.4) | Cierre correcto del bloque de código |
| 2 | Encabezados §5–§12 sin formato (`##5.` en lugar de `## 5.`) | Encabezados Markdown válidos |
| 3 | Árbol de directorios sin bloque de código | Envuelto en fences ` ``` ` |
| 4 | Tabla de riesgos sin formato | Tabla Markdown estándar |
| 5 | Enum `Role` con valor `USER` vs roles documentados | Alineado con `SUPER_ADMIN`, `DOCTOR`, etc. |
| 6 | Modelos referenciados pero no definidos (`Profile`, `Prescription`, etc.) | Esquema simplificado + nota de borrador |
| 7 | Endpoints `DELETE` en pacientes/HCE | Reemplazados por desactivación lógica |

### A.2 Inconsistencias detectadas (requieren decisión)

1. **MVP vs alcance:** El documento describe un MVP pero incluye laboratorio, contabilidad, telemedicina y fidelización. Definir qué entra en v1.0.
2. **Autenticación dual:** JWT (NestJS) + NextAuth.js requiere documentar el flujo: NextAuth como cliente que consume tokens del backend NestJS.
3. **Facturación electrónica:** Falta jurisdicción (¿República Dominicana? ¿DGII?). Impacta campos y integraciones.
4. **1000 usuarios concurrentes (§3.2):** Irreal para un policonsultorio típico; se ajustó a ~100. Revisar según dimensionamiento real.
5. **JasperReports:** Stack Java ajeno a NestJS; preferir PDFKit/ExcelJS salvo requisito explícito.
6. **Entidades faltantes en modelo:** Consultorios, especialidades, horarios médicos, caja (apertura/cierre), recetas, ítems de factura, proveedores, aseguradoras.
7. **Cola OPD:** Funcionalidad crítica descrita en §2.1.2 pero ausente en arquitectura original; se añadió `QueueEntry` y endpoint `check-in`.
8. **Tiempo real:** La cola de espera requiere WebSockets o SSE; no estaba en el stack original.

### A.3 Sugerencias para el desarrollo

#### Priorización MVP recomendada

```
Must have (v1.0):
  Auth + roles → Pacientes → Citas/Agenda → OPD/Cola → HCE básica → Facturación/Caja → Reportes básicos

Should have (v1.1):
  Inventario → Farmacia → Recordatorios SMS/email → Documentos S3

Could have (v2.0):
  Laboratorio → Seguros → Contabilidad → Portal paciente → Telemedicina → Fidelización
```

#### Decisiones técnicas sugeridas

- **Monorepo** con Turborepo o Nx para compartir tipos TypeScript entre frontend y backend.
- **Borrado lógico** (`isActive`, `deletedAt`) en pacientes, HCE y facturas; nunca `DELETE` físico en datos clínicos.
- **Versionado de HCE:** tabla `MedicalRecordVersion` para cumplir auditoría.
- **CIE-10:** catálogo en tabla separada; no almacenar solo texto libre en diagnóstico.
- **Jobs asíncronos:** BullMQ + Redis para recordatorios, reportes y emails.
- **Permisos:** RBAC con tabla `Permission` + `RolePermission`, no solo enum de rol.
- **Multi-tenancy:** si UNIOR tiene varias sedes a futuro, planificar `clinicId` desde el inicio.

#### Flujo crítico a prototipar primero

```
Paciente llega → Check-in OPD → Cola por especialidad → Médico atiende → HCE → Factura → Cobro → Cierre caja
```

Este flujo vertical valida la integración entre los módulos más importantes antes de expandir funcionalidades periféricas.
