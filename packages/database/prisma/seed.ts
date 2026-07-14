import {
  PermissionAction,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS: { code: string; module: string; action: PermissionAction }[] = [
  { code: 'patients:read', module: 'patients', action: PermissionAction.READ },
  { code: 'patients:write', module: 'patients', action: PermissionAction.WRITE },
  { code: 'patients:export', module: 'patients', action: PermissionAction.EXPORT },
  { code: 'appointments:read', module: 'appointments', action: PermissionAction.READ },
  { code: 'appointments:write', module: 'appointments', action: PermissionAction.WRITE },
  { code: 'medical-records:read', module: 'medical-records', action: PermissionAction.READ },
  { code: 'medical-records:write', module: 'medical-records', action: PermissionAction.WRITE },
  { code: 'billing:read', module: 'billing', action: PermissionAction.READ },
  { code: 'billing:write', module: 'billing', action: PermissionAction.WRITE },
  { code: 'inventory:read', module: 'inventory', action: PermissionAction.READ },
  { code: 'inventory:write', module: 'inventory', action: PermissionAction.WRITE },
  { code: 'reports:read', module: 'reports', action: PermissionAction.READ },
  { code: 'reports:export', module: 'reports', action: PermissionAction.EXPORT },
  { code: 'users:read', module: 'users', action: PermissionAction.READ },
  { code: 'users:write', module: 'users', action: PermissionAction.WRITE },
  { code: 'insurance:read', module: 'insurance', action: PermissionAction.READ },
  { code: 'insurance:write', module: 'insurance', action: PermissionAction.WRITE },
  { code: 'holidays:read', module: 'holidays', action: PermissionAction.READ },
  { code: 'holidays:write', module: 'holidays', action: PermissionAction.WRITE },
];

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  ADMIN: PERMISSIONS.map((p) => p.code),
  DOCTOR: [
    'patients:read',
    'appointments:read',
    'appointments:write',
    'medical-records:read',
    'medical-records:write',
    'billing:read',
    'reports:read',
  ],
  NURSE: [
    'patients:read',
    'patients:write',
    'appointments:read',
    'appointments:write',
    'medical-records:read',
    'medical-records:write',
    'inventory:read',
  ],
  RECEPTION: [
    'patients:read',
    'patients:write',
    'appointments:read',
    'appointments:write',
    'billing:read',
    'billing:write',
  ],
  ACCOUNTING: [
    'billing:read',
    'billing:write',
    'reports:read',
    'reports:export',
    'insurance:read',
  ],
  PHARMACY: [
    'inventory:read',
    'inventory:write',
    'medical-records:read',
    'patients:read',
  ],
  LAB: [
    'medical-records:read',
    'medical-records:write',
    'reports:read',
  ],
  PATIENT: [],
};

async function ensureUser(
  clinicId: string,
  data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dni: string;
    phone: string;
    role: Role;
    title?: string;
    licenseNumber?: string;
    schedules?: { dayOfWeek: number; startTime: string; endTime: string; slotMinutes?: number }[];
  },
) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const hasProfile = !!(data.title || data.licenseNumber);

  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
    },
    create: {
      clinicId,
      email: data.email,
      password: passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      dni: data.dni,
      phone: data.phone,
      role: data.role,
      ...(hasProfile && {
        profile: {
          create: {
            title: data.title,
            licenseNumber: data.licenseNumber,
          },
        },
      }),
    },
  });

  // Perfil del doctor (upsert para que se actualice si cambió)
  if (hasProfile) {
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { title: data.title, licenseNumber: data.licenseNumber },
      create: {
        userId: user.id,
        title: data.title,
        licenseNumber: data.licenseNumber,
      },
    });
  }

  // Horarios (reemplazar siempre)
  if (data.schedules && data.schedules.length > 0) {
    await prisma.doctorSchedule.deleteMany({ where: { doctorId: user.id } });
    await prisma.doctorSchedule.createMany({
      data: data.schedules.map((s) => ({
        doctorId: user.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotMinutes: s.slotMinutes ?? 30,
      })),
    });
  }

  return user;
}

async function ensureDoctorSpecialty(doctorId: string, specialtyId: string) {
  const existing = await prisma.doctorSpecialty.findFirst({
    where: { doctorId, specialtyId },
  });
  if (!existing) {
    await prisma.doctorSpecialty.create({
      data: { doctorId, specialtyId },
    });
  }
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── Clínica ──────────────────────────────────────────
  const clinic = await prisma.clinic.upsert({
    where: { code: 'UNIOR-MAIN' },
    update: {},
    create: {
      name: 'Policonsultorio UNIOR',
      code: 'UNIOR-MAIN',
      address: 'Av. Principal #123',
      city: 'Santo Domingo',
      province: 'Distrito Nacional',
      phone: '809-555-0100',
      email: 'info@unior.local',
    },
  });
  console.log(`   🏥 Clínica: ${clinic.name} (${clinic.code})`);

  // ─── Permisos ──────────────────────────────────────────
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS) as [Role, string[]][]) {
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId } },
        update: {},
        create: { role, permissionId },
      });
    }
  }
  console.log(`   🔐 ${PERMISSIONS.length} permisos, ${Object.keys(ROLE_PERMISSIONS).length} roles configurados`);

  // ─── Especialidades ───────────────────────────────────
  const specialties = [
    { code: 'MED-GEN', name: 'Medicina General', description: 'Consulta de medicina general' },
    { code: 'PEDIA', name: 'Pediatría', description: 'Atención médica infantil' },
    { code: 'GINE', name: 'Ginecología', description: 'Salud integral de la mujer' },
    { code: 'CARDIO', name: 'Cardiología', description: 'Diagnóstico y tratamiento cardiovascular' },
    { code: 'DERMA', name: 'Dermatología', description: 'Salud de la piel' },
  ];

  for (const s of specialties) {
    await prisma.specialty.upsert({
      where: { clinicId_code: { clinicId: clinic.id, code: s.code } },
      update: {},
      create: { clinicId: clinic.id, ...s },
    });
  }
  const medGen = await prisma.specialty.findUnique({
    where: { clinicId_code: { clinicId: clinic.id, code: 'MED-GEN' } },
  });

  // ─── Consultorios ─────────────────────────────────────
  const rooms = [
    { code: 'C-01', name: 'Consultorio 1', floor: '1' },
    { code: 'C-02', name: 'Consultorio 2', floor: '1' },
    { code: 'C-03', name: 'Consultorio 3', floor: '2' },
    { code: 'C-04', name: 'Sala procedimientos', floor: '2' },
  ];

  for (const r of rooms) {
    await prisma.consultationRoom.upsert({
      where: { clinicId_code: { clinicId: clinic.id, code: r.code } },
      update: {},
      create: { clinicId: clinic.id, ...r },
    });
  }

  // ─── Caja registradora ────────────────────────────────
  await prisma.cashRegister.upsert({
    where: { clinicId_code: { clinicId: clinic.id, code: 'CAJA-01' } },
    update: {},
    create: {
      clinicId: clinic.id,
      name: 'Caja Principal',
      code: 'CAJA-01',
    },
  });

  // ─── Catálogo de servicios ────────────────────────────
  const services = [
    { code: 'CONS-GEN', name: 'Consulta Medicina General', price: 1500 },
    { code: 'CONS-PED', name: 'Consulta Pediatría', price: 1300 },
    { code: 'CONS-GIN', name: 'Consulta Ginecología', price: 1800 },
    { code: 'CONS-CARD', name: 'Consulta Cardiología', price: 2500 },
    { code: 'LAB-BASIC', name: 'Laboratorio básico', price: 2200 },
    { code: 'ECG', name: 'Electrocardiograma', price: 1800 },
    { code: 'INY', name: 'Aplicación de inyectable', price: 350 },
    { code: 'CURAC', name: 'Curación simple', price: 500 },
  ];
  for (const s of services) {
    await prisma.serviceCatalogItem.upsert({
      where: { clinicId_code: { clinicId: clinic.id, code: s.code } },
      update: {},
      create: { clinicId: clinic.id, ...s },
    });
  }

  // ─── Códigos CIE-10 ───────────────────────────────────
  const cie10Samples = [
    { code: 'J06.9', description: 'Infección aguda de vías respiratorias superiores, no especificada', category: 'Respiratorio' },
    { code: 'I10', description: 'Hipertensión esencial (primaria)', category: 'Cardiovascular' },
    { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones', category: 'Endocrino' },
    { code: 'M54.5', description: 'Lumbago no especificado', category: 'Musculoesquelético' },
    { code: 'K21.0', description: 'Enfermedad por reflujo gastroesofágico con esofagitis', category: 'Digestivo' },
    { code: 'R51', description: 'Cefalea', category: 'Neurológico' },
    { code: 'N39.0', description: 'Infección de vías urinarias', category: 'Genitourinario' },
    { code: 'L20.9', description: 'Dermatitis atópica, no especificada', category: 'Dermatología' },
    { code: 'F41.1', description: 'Trastorno de ansiedad generalizada', category: 'Mental' },
    { code: 'Z00.0', description: 'Examen médico general', category: 'Preventivo' },
  ];
  for (const cie of cie10Samples) {
    await prisma.cie10Code.upsert({
      where: { code: cie.code },
      update: {},
      create: cie,
    });
  }

  // ─── Usuarios base ─────────────────────────────────────
  const fullWeek = [
    { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
    { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
    { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
    { dayOfWeek: 3, startTime: '08:00', endTime: '12:00' },
    { dayOfWeek: 4, startTime: '08:00', endTime: '12:00' },
    { dayOfWeek: 5, startTime: '08:00', endTime: '12:00' },
  ];

  const superAdmin = await ensureUser(clinic.id, {
    email: 'admin@unior.local',
    password: 'Admin123!',
    firstName: 'Administrador',
    lastName: 'UNIOR',
    dni: '00000000001',
    phone: '809-555-0101',
    role: Role.SUPER_ADMIN,
    title: 'Administrador del Sistema',
  });

  const doctor = await ensureUser(clinic.id, {
    email: 'doctor@unior.local',
    password: 'Doctor123!',
    firstName: 'Juan',
    lastName: 'Pérez',
    dni: '00000000002',
    phone: '809-555-0102',
    role: Role.DOCTOR,
    title: 'Médico General',
    licenseNumber: 'MED-12345',
    schedules: fullWeek,
  });
  if (medGen) await ensureDoctorSpecialty(doctor.id, medGen.id);

  await ensureUser(clinic.id, {
    email: 'admin2@unior.local',
    password: 'Admin123!',
    firstName: 'María',
    lastName: 'García',
    dni: '00000000003',
    phone: '809-555-0103',
    role: Role.ADMIN,
    title: 'Administradora Clínica',
  });

  await ensureUser(clinic.id, {
    email: 'recepcion@unior.local',
    password: 'Recep123!',
    firstName: 'Ana',
    lastName: 'Rodríguez',
    dni: '00000000004',
    phone: '809-555-0104',
    role: Role.RECEPTION,
  });

  await ensureUser(clinic.id, {
    email: 'enfermera@unior.local',
    password: 'Enferm123!',
    firstName: 'Lucía',
    lastName: 'Martínez',
    dni: '00000000005',
    phone: '809-555-0105',
    role: Role.NURSE,
    title: 'Enfermera',
    licenseNumber: 'ENF-54321',
    schedules: fullWeek,
  });

  await ensureUser(clinic.id, {
    email: 'contable@unior.local',
    password: 'Conta123!',
    firstName: 'Roberto',
    lastName: 'Hernández',
    dni: '00000000006',
    phone: '809-555-0106',
    role: Role.ACCOUNTING,
  });

  await ensureUser(clinic.id, {
    email: 'farmacia@unior.local',
    password: 'Farma123!',
    firstName: 'Patricia',
    lastName: 'Sánchez',
    dni: '00000000007',
    phone: '809-555-0107',
    role: Role.PHARMACY,
  });

  await ensureUser(clinic.id, {
    email: 'lab@unior.local',
    password: 'Lab123!',
    firstName: 'Miguel',
    lastName: 'Ramírez',
    dni: '00000000008',
    phone: '809-555-0108',
    role: Role.LAB,
    title: 'Bioanalista',
    licenseNumber: 'LAB-99887',
  });

  // ─── Aseguradora de ejemplo ───────────────────────────
  await prisma.insuranceProvider.upsert({
    where: { clinicId_code: { clinicId: clinic.id, code: 'ARS-001' } },
    update: {},
    create: {
      clinicId: clinic.id,
      name: 'ARS Universal',
      code: 'ARS-001',
      phone: '809-555-0200',
      email: 'contacto@arsuniversal.example',
      agreements: {
        create: [
          {
            name: 'Plan Básico',
            coveragePercent: 80,
            copayAmount: 200,
            validFrom: new Date('2026-01-01'),
          },
          {
            name: 'Plan Premium',
            coveragePercent: 95,
            copayAmount: 100,
            validFrom: new Date('2026-01-01'),
          },
        ],
      },
    },
  });

  await prisma.insuranceProvider.upsert({
    where: { clinicId_code: { clinicId: clinic.id, code: 'SEG-002' } },
    update: {},
    create: {
      clinicId: clinic.id,
      name: 'Seguros Horizonte',
      code: 'SEG-002',
      phone: '809-555-0201',
    },
  });

  // ─── Proveedor de inventario ──────────────────────────
  await prisma.supplier.upsert({
    where: { code: 'PROV-001' },
    update: {},
    create: {
      code: 'PROV-001',
      name: 'Distribuidora FarmaDominicana',
      phone: '809-555-0300',
      email: 'ventas@farmadom.example',
    },
  });

  // ─── Productos de inventario ──────────────────────────
  const products = [
    { code: 'PARA-500', name: 'Paracetamol 500mg', category: 'MEDICATION_GENERIC', salePrice: 50, purchasePrice: 25, minStock: 50, stock: 200, unit: 'tabletas' },
    { code: 'IBU-400', name: 'Ibuprofeno 400mg', category: 'MEDICATION_GENERIC', salePrice: 80, purchasePrice: 40, minStock: 30, stock: 150, unit: 'tabletas' },
    { code: 'AMOX-500', name: 'Amoxicilina 500mg', category: 'MEDICATION_BRAND', salePrice: 250, purchasePrice: 150, minStock: 20, stock: 80, unit: 'cápsulas' },
    { code: 'GUANTE-M', name: 'Guantes látex M (caja 100)', category: 'MEDICAL_SUPPLY', salePrice: 600, purchasePrice: 350, minStock: 10, stock: 50, unit: 'caja' },
    { code: 'MASCARILLA', name: 'Mascarilla quirúrgica (caja 50)', category: 'MEDICAL_SUPPLY', salePrice: 250, purchasePrice: 130, minStock: 20, stock: 8, unit: 'caja' },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { clinicId_code: { clinicId: clinic.id, code: p.code } },
      update: {},
      create: { clinicId: clinic.id, ...p },
    });
  }

  // ─── Feriados RD 2026 ─────────────────────────────────
  const holidays = [
    { code: '2026-01-01', name: 'Año Nuevo', date: '2026-01-01' },
    { code: '2026-01-21', name: 'Día de la Altagracia', date: '2026-01-21' },
    { code: '2026-01-26', name: 'Día de Duarte', date: '2026-01-26' },
    { code: '2026-02-27', name: 'Día de la Independencia', date: '2026-02-27' },
    { code: '2026-04-03', name: 'Viernes Santo', date: '2026-04-03' },
    { code: '2026-05-01', name: 'Día del Trabajo', date: '2026-05-01' },
    { code: '2026-08-16', name: 'Día de la Restauración', date: '2026-08-16' },
    { code: '2026-09-24', name: 'Día de las Mercedes', date: '2026-09-24' },
    { code: '2026-11-06', name: 'Día de la Constitución', date: '2026-11-06' },
    { code: '2026-12-25', name: 'Navidad', date: '2026-12-25' },
  ];
  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { id: `holiday-${h.code}` },
      update: {},
      create: {
        id: `holiday-${h.code}`,
        name: h.name,
        date: new Date(h.date),
        isRecurring: false,
      },
    });
  }

  console.log('');
  console.log('✅ Seed completado');
  console.log('');
  console.log('   👤 Super Admin:       admin@unior.local / Admin123!');
  console.log('   👤 Administrador:     admin2@unior.local / Admin123!');
  console.log('   🩺 Doctor:            doctor@unior.local / Doctor123!');
  console.log('   💉 Enfermera:         enfermera@unior.local / Enferm123!');
  console.log('   📞 Recepción:         recepcion@unior.local / Recep123!');
  console.log('   💰 Contable:          contable@unior.local / Conta123!');
  console.log('   💊 Farmacia:          farmacia@unior.local / Farma123!');
  console.log('   🧪 Laboratorio:       lab@unior.local / Lab123!');
}

main()
  .catch((e) => {
    console.error('');
    console.error('❌ Error en seed:');
    console.error(e instanceof Error ? e.stack ?? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
