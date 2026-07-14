'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  CalendarClock,
  XCircle,
  Play,
  FileText,
  Receipt,
  Clock,
  User,
  Stethoscope,
  Building2,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { statusColor, statusLabel, formatDate, calculateAge } from '@/lib/format';

interface Appointment {
  id: string;
  patientId?: string;
  doctorId?: string;
  specialtyId?: string;
  roomId?: string;
  dateTime?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  status?: string;
  reason?: string;
  notes?: string;
  type?: string;
  patient?: { id: string; firstName?: string; lastName?: string; fullName?: string; birthDate?: string; documentId?: string; phone?: string };
  doctor?: { id: string; firstName?: string; lastName?: string; fullName?: string; specialty?: { name?: string } };
  specialty?: { id: string; name?: string };
  room?: { id: string; name?: string; number?: string };
  medicalRecordId?: string;
  invoiceId?: string;
}

function nameOf(p?: { firstName?: string; lastName?: string; fullName?: string }) {
  if (!p) return '—';
  if (p.fullName) return p.fullName;
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—';
}

function ModalShell({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Prompt({ open, onClose, title, withDateTime, onConfirm }: {
  open: boolean; onClose: () => void; title: string;
  withDateTime?: boolean;
  onConfirm: (v: { reason: string; newDateTime?: string }) => void;
}) {
  const [reason, setReason] = useState('');
  const [dt, setDt] = useState('');
  useEffect(() => { if (open) { setReason(''); setDt(''); } }, [open]);
  if (!open) return null;
  return (
    <ModalShell open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {withDateTime && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nueva fecha y hora</label>
            <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => onConfirm({ reason: reason.trim(), newDateTime: dt || undefined })}
            disabled={withDateTime ? !dt : false}
            className="bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-4 py-2 text-sm disabled:opacity-50">
            Confirmar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await api.appointments.get(id);
      const data = (res.data as Appointment | undefined) ?? null;
      setAppt(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la cita');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function withAction(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  }

  async function actConfirm() { await withAction(() => api.appointments.confirm(id)); }
  async function actCheckIn() { await withAction(() => api.appointments.checkIn(id)); }
  async function actStart()   { await withAction(() => api.queue.call(id)); }
  async function actCancel({ reason }: { reason: string; newDateTime?: string }) {
    if (!reason) return;
    await withAction(() => api.appointments.cancel(id, reason));
    setCancelOpen(false);
  }
  async function actReschedule({ reason, newDateTime }: { reason: string; newDateTime?: string }) {
    if (!newDateTime) return;
    await withAction(() => api.appointments.reschedule(id, new Date(newDateTime).toISOString(), reason));
    setReschedOpen(false);
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Cargando...</div>;
  }
  if (error && !appt) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push('/appointments')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Volver a citas
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      </div>
    );
  }
  if (!appt) return null;

  const status = appt.status ?? 'SCHEDULED';
  const dateStr = appt.dateTime ?? appt.startTime;
  const dateLabel = dateStr ? formatDate(dateStr, true) : '—';
  const typeLabel = appt.type === 'TELEMEDICINE' ? 'Telemedicina' : appt.type === 'IN_PERSON' ? 'Presencial' : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/appointments')}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Volver a citas
          </button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Cita #{appt.id.slice(0, 8)}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(status))}>
              {statusLabel(status)}
            </span>
            <span className="text-xs text-slate-500">Actualizado en vivo</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Información general</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field icon={User} label="Paciente">
                <div className="font-medium">{nameOf(appt.patient)}</div>
                {appt.patient?.birthDate && (
                  <div className="text-xs text-slate-500">{calculateAge(appt.patient.birthDate)} años</div>
                )}
                {appt.patient?.documentId && (
                  <div className="text-xs text-slate-500">Cédula: {appt.patient.documentId}</div>
                )}
              </Field>
              <Field icon={Stethoscope} label="Doctor">
                <div className="font-medium">{nameOf(appt.doctor)}</div>
                {appt.doctor?.specialty?.name && (
                  <div className="text-xs text-slate-500">{appt.doctor.specialty.name}</div>
                )}
              </Field>
              <Field icon={Activity} label="Especialidad">
                {appt.specialty?.name ?? '—'}
              </Field>
              <Field icon={Building2} label="Consultorio">
                {appt.room?.name ?? appt.room?.number ?? 'Sin asignar'}
              </Field>
              <Field icon={CalendarClock} label="Fecha y hora">
                {dateLabel}
              </Field>
              <Field icon={Clock} label="Duración">
                {appt.duration ? `${appt.duration} min` : '—'}
              </Field>
              <Field icon={Activity} label="Tipo">
                {typeLabel}
              </Field>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Motivo y notas</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-slate-700">Motivo:</span>{' '}
                <span className="text-slate-600">{appt.reason ?? 'Sin motivo registrado'}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Notas:</span>{' '}
                <span className="text-slate-600">{appt.notes ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Related records */}
          {(appt.medicalRecordId || appt.invoiceId) && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Documentos relacionados</h2>
              <div className="flex flex-wrap gap-3">
                {appt.medicalRecordId && (
                  <Link href={`/medical-records/${appt.medicalRecordId}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <FileText className="h-4 w-4" /> Historia clínica
                  </Link>
                )}
                {appt.invoiceId && (
                  <Link href={`/billing/${appt.invoiceId}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Receipt className="h-4 w-4" /> Factura
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Acciones</h3>
            <div className="space-y-2">
              {status === 'SCHEDULED' && (
                <ActionBtn onClick={actConfirm} disabled={busy} icon={CheckCircle2} variant="primary" label="Confirmar cita" />
              )}
              {(status === 'CONFIRMED' || status === 'SCHEDULED') && (
                <ActionBtn onClick={actCheckIn} disabled={busy} icon={UserCheck} variant="primary" label="Check-in" />
              )}
              {status === 'CHECKED_IN' && (
                <ActionBtn onClick={actStart} disabled={busy} icon={Play} variant="primary" label="Iniciar consulta" />
              )}
              {['SCHEDULED', 'CONFIRMED'].includes(status) && (
                <ActionBtn onClick={() => setReschedOpen(true)} disabled={busy} icon={CalendarClock} variant="outline" label="Reagendar" />
              )}
              {!['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(status) && (
                <ActionBtn onClick={() => setCancelOpen(true)} disabled={busy} icon={XCircle} variant="danger" label="Cancelar cita" />
              )}
              {['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(status) && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Esta cita está cerrada, no hay acciones disponibles.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <p>ID: <span className="font-mono text-slate-700">{appt.id}</span></p>
            {appt.patient?.phone && (
              <p className="mt-1">Tel: <span className="text-slate-700">{appt.patient.phone}</span></p>
            )}
          </div>
        </aside>
      </div>

      <Prompt open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar cita"
        onConfirm={actCancel} />

      <Prompt open={reschedOpen} onClose={() => setReschedOpen(false)} title="Reagendar cita"
        withDateTime onConfirm={actReschedule} />
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function ActionBtn({ onClick, disabled, icon: Icon, label, variant }: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: 'primary' | 'outline' | 'danger';
}) {
  const styles =
    variant === 'primary'
      ? 'bg-primary-600 text-white hover:bg-primary-700'
      : variant === 'danger'
      ? 'border border-red-300 text-red-700 hover:bg-red-50'
      : 'border border-slate-300 text-slate-700 hover:bg-slate-50';
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50', styles)}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
