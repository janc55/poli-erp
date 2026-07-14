'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  Mail,
  CalendarDays,
  Stethoscope,
  Receipt,
  Activity,
  IdCard,
  User,
  Loader2,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  calculateAge,
  formatCurrency,
  formatDate,
  statusColor,
  statusLabel,
} from '@/lib/format';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type Tab = 'info' | 'records' | 'appointments' | 'billing' | 'timeline';

interface Patient {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  nationality?: string | null;
  occupation?: string | null;
  bloodType?: string | null;
  maritalStatus?: string | null;
  secondaryPhone?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

interface Doctor {
  firstName: string;
  lastName: string;
}

interface MedicalRecord {
  id: string;
  visitDate: string;
  reason?: string | null;
  doctor?: Doctor | null;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  doctor?: Doctor | null;
  specialty?: { name: string } | null;
}

interface Billing {
  id: string;
  invoiceNumber: string;
  total: number | string;
  status: string;
  createdAt: string;
}

interface Timeline {
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  billings: Billing[];
}

const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  OTHER: 'Otro',
};

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'info', label: 'Información', icon: User },
  { id: 'records', label: 'Historial clínico', icon: FileText },
  { id: 'appointments', label: 'Citas', icon: CalendarDays },
  { id: 'billing', label: 'Facturación', icon: Receipt },
  { id: 'timeline', label: 'Timeline', icon: Activity },
];

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params?.id;

  const [tab, setTab] = useState<Tab>('info');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState({
    patient: true,
    records: false,
    timeline: false,
  });
  const [error, setError] = useState<string | null>(null);

  const loadPatient = useCallback(async () => {
    if (!patientId) return;
    setLoading((s) => ({ ...s, patient: true }));
    setError(null);
    try {
      const res = await api.patients.get(patientId);
      setPatient((res as { data: Patient }).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar paciente');
    } finally {
      setLoading((s) => ({ ...s, patient: false }));
    }
  }, [patientId]);

  const loadRecords = useCallback(async () => {
    if (!patientId) return;
    setLoading((s) => ({ ...s, records: true }));
    try {
      const res = await api.medicalRecords.byPatient(patientId);
      setRecords(((res as { data: MedicalRecord[] }).data) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar historial clínico');
    } finally {
      setLoading((s) => ({ ...s, records: false }));
    }
  }, [patientId]);

  const loadTimeline = useCallback(async () => {
    if (!patientId) return;
    setLoading((s) => ({ ...s, timeline: true }));
    try {
      const res = await api.patients.timeline(patientId);
      setTimeline((res as { data: Timeline }).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar timeline');
    } finally {
      setLoading((s) => ({ ...s, timeline: false }));
    }
  }, [patientId]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  useEffect(() => {
    if (tab === 'records') void loadRecords();
    if (tab === 'appointments' || tab === 'billing' || tab === 'timeline')
      void loadTimeline();
  }, [tab, loadRecords, loadTimeline]);

  if (loading.patient) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Cargando paciente...</span>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push('/patients')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pacientes
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        Paciente no encontrado
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const age = patient.birthDate ? calculateAge(patient.birthDate) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pacientes
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <IdCard className="h-3.5 w-3.5" />
                  {patient.dni}
                </span>
                {age !== null && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {age} años
                  </span>
                )}
                {patient.gender && (
                  <span>{GENDER_LABELS[patient.gender] ?? patient.gender}</span>
                )}
                {patient.bloodType && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    Sangre: {patient.bloodType.replace('_', ' ').replace('POSITIVE', '+').replace('NEGATIVE', '-')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-slate-600 sm:items-end">
            {patient.phone && (
              <a
                href={`tel:${patient.phone}`}
                className="inline-flex items-center gap-2 hover:text-primary-700"
              >
                <Phone className="h-4 w-4" />
                {patient.phone}
              </a>
            )}
            {patient.email && (
              <a
                href={`mailto:${patient.email}`}
                className="inline-flex items-center gap-2 hover:text-primary-700"
              >
                <Mail className="h-4 w-4" />
                {patient.email}
              </a>
            )}
          </div>
        </div>

        <div className="border-b border-slate-200 px-4">
          <nav className="-mb-px flex flex-wrap gap-1" aria-label="Tabs">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  tab === id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {tab === 'info' && <InfoTab patient={patient} />}
          {tab === 'records' && <RecordsTab records={records} loading={loading.records} />}
          {tab === 'appointments' && (
            <AppointmentsTab
              appointments={timeline?.appointments ?? []}
              loading={loading.timeline}
            />
          )}
          {tab === 'billing' && (
            <BillingTab billings={timeline?.billings ?? []} loading={loading.timeline} />
          )}
          {tab === 'timeline' && (
            <TimelineTab
              timeline={timeline}
              loading={loading.timeline}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function InfoTab({ patient }: { patient: Patient }) {
  const sections: { title: string; rows: [string, React.ReactNode][] }[] = [
    {
      title: 'Datos personales',
      rows: [
        ['Nombres', patient.firstName],
        ['Apellidos', patient.lastName],
        ['DNI', patient.dni],
        ['Fecha de nacimiento', formatDate(patient.birthDate)],
        ['Edad',
          patient.birthDate ? `${calculateAge(patient.birthDate)} años` : '—',
        ],
        ['Género', GENDER_LABELS[patient.gender] ?? patient.gender],
        ['Estado civil', patient.maritalStatus ?? '—'],
        ['Tipo de sangre', patient.bloodType ?? '—'],
        ['Nacionalidad', patient.nationality ?? '—'],
        ['Ocupación', patient.occupation ?? '—'],
      ],
    },
    {
      title: 'Contacto',
      rows: [
        ['Teléfono', patient.phone || '—'],
        ['Teléfono secundario', patient.secondaryPhone || '—'],
        ['Email', patient.email || '—'],
        ['Dirección', patient.address || '—'],
        ['Ciudad', patient.city || '—'],
        ['Provincia', patient.state || '—'],
        ['Código postal', patient.postalCode || '—'],
      ],
    },
    {
      title: 'Contacto de emergencia',
      rows: [
        ['Nombre', patient.emergencyContactName || '—'],
        ['Teléfono', patient.emergencyContactPhone || '—'],
        ['Relación', patient.emergencyContactRelationship || '—'],
      ],
    },
    {
      title: 'Información clínica',
      rows: [
        ['Alergias', patient.allergies || '—'],
        ['Enfermedades crónicas', patient.chronicDiseases || '—'],
        ['Notas', patient.notes || '—'],
      ],
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            {section.title}
          </h3>
          <dl className="space-y-2 text-sm">
            {section.rows.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <dt className="w-40 shrink-0 text-slate-500">{label}</dt>
                <dd className="text-slate-800">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function RecordsTab({
  records,
  loading,
}: {
  records: MedicalRecord[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2">Cargando historial...</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Sin historial clínico"
        message="Este paciente aún no tiene registros clínicos."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li
          key={r.id}
          className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">
              {r.reason || 'Consulta'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {r.doctor
                ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}`
                : 'Sin médico asignado'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            {formatDate(r.visitDate, true)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AppointmentsTab({
  appointments,
  loading,
}: {
  appointments: Appointment[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2">Cargando citas...</span>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin citas"
        message="Este paciente aún no tiene citas registradas."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {appointments.map((a) => (
        <li
          key={a.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {a.specialty?.name ?? 'Consulta'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {a.doctor
                ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`
                : 'Sin médico asignado'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {formatDate(a.dateTime, true)}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                statusColor(a.status),
              )}
            >
              {statusLabel(a.status)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function BillingTab({
  billings,
  loading,
}: {
  billings: Billing[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2">Cargando facturación...</span>
      </div>
    );
  }

  if (billings.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sin facturas"
        message="Este paciente aún no tiene facturas emitidas."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-slate-600">N° Factura</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-600">Fecha</th>
            <th className="px-4 py-2 text-right font-semibold text-slate-600">Total</th>
            <th className="px-4 py-2 text-right font-semibold text-slate-600">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {billings.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-mono text-slate-800">{b.invoiceNumber}</td>
              <td className="px-4 py-2 text-slate-600">{formatDate(b.createdAt)}</td>
              <td className="px-4 py-2 text-right font-medium text-slate-800">
                {formatCurrency(b.total)}
              </td>
              <td className="px-4 py-2 text-right">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    statusColor(b.status),
                  )}
                >
                  {statusLabel(b.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineTab({
  timeline,
  loading,
}: {
  timeline: Timeline | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2">Cargando timeline...</span>
      </div>
    );
  }

  if (!timeline) {
    return null;
  }

  type Event = { date: string; kind: 'appointment' | 'record' | 'billing'; payload: unknown };
  const events: Event[] = [];

  for (const a of timeline.appointments ?? []) {
    events.push({ date: a.dateTime, kind: 'appointment', payload: a });
  }
  for (const r of timeline.medicalRecords ?? []) {
    events.push({ date: r.visitDate, kind: 'record', payload: r });
  }
  for (const b of timeline.billings ?? []) {
    events.push({ date: b.createdAt, kind: 'billing', payload: b });
  }

  events.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Sin actividad"
        message="Aún no hay eventos en el historial del paciente."
      />
    );
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
      {events.map((e, idx) => (
        <li key={idx} className="relative">
          <span
            className={cn(
              'absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full text-white',
              e.kind === 'appointment' && 'bg-blue-500',
              e.kind === 'record' && 'bg-emerald-500',
              e.kind === 'billing' && 'bg-amber-500',
            )}
          >
            {e.kind === 'appointment' && <CalendarDays className="h-3 w-3" />}
            {e.kind === 'record' && <Stethoscope className="h-3 w-3" />}
            {e.kind === 'billing' && <Receipt className="h-3 w-3" />}
          </span>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            {e.kind === 'appointment' && <TimelineAppointment entry={e.payload as Appointment} />}
            {e.kind === 'record' && <TimelineRecord entry={e.payload as MedicalRecord} />}
            {e.kind === 'billing' && <TimelineBilling entry={e.payload as Billing} />}
            <p className="mt-1 text-xs text-slate-400">
              {formatDate(e.date, true)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TimelineAppointment({ entry }: { entry: Appointment }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-900">
        Cita: {entry.specialty?.name ?? 'Consulta'}
      </p>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          statusColor(entry.status),
        )}
      >
        {statusLabel(entry.status)}
      </span>
    </div>
  );
}

function TimelineRecord({ entry }: { entry: MedicalRecord }) {
  return (
    <p className="text-sm text-slate-800">
      <span className="font-medium text-slate-900">Historia clínica:</span>{' '}
      {entry.reason || 'Consulta'}
      {entry.doctor && (
        <span className="text-slate-500">
          {' '}— Dr. {entry.doctor.firstName} {entry.doctor.lastName}
        </span>
      )}
    </p>
  );
}

function TimelineBilling({ entry }: { entry: Billing }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-900">
        Factura <span className="font-mono">{entry.invoiceNumber}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-700">
          {formatCurrency(entry.total)}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            statusColor(entry.status),
          )}
        >
          {statusLabel(entry.status)}
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <Icon className="h-8 w-8 text-slate-300" />
      <p className="mt-2 text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
    </div>
  );
}
