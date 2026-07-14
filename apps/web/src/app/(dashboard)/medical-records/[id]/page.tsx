'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardList,
  Edit,
  FileSignature,
  FlaskConical,
  History,
  Pill,
  Save,
  X,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { formatDate, statusColor, statusLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}
interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}
interface Cie10Code {
  code: string;
  description: string;
}
interface Diagnosis {
  id?: string;
  cie10Code?: Cie10Code;
  code?: string;
  description?: string;
  isPrimary?: boolean;
  type?: string;
}
interface MedicalRecord {
  id: string;
  visitDate?: string;
  visitAt?: string;
  createdAt?: string;
  patient?: Patient;
  patientId?: string;
  doctor?: Doctor;
  motivo?: string;
  anamnesis?: string;
  alergias?: string;
  medicamentos?: string;
  antecedentesPersonales?: string;
  antecedentesFamiliares?: string;
  examenFisico?: string;
  signosVitales?: Record<string, number | string> | null;
  tratamiento?: string;
  notas?: string;
  signed?: boolean;
  isSigned?: boolean;
  signedAt?: string;
  signatureUrl?: string;
  diagnoses?: Diagnosis[];
}
interface Version {
  id?: string;
  version?: number;
  createdAt?: string;
  changeReason?: string;
  changedBy?: { firstName?: string; lastName?: string };
}
interface Prescription {
  id: string;
  medicalRecordId?: string;
  issuedAt?: string;
  status?: string;
  medications?: unknown[];
  notes?: string;
}
interface LabOrder {
  id: string;
  medicalRecordId?: string;
  examType?: { name?: string };
  examName?: string;
  status?: string;
  createdAt?: string;
  priority?: string;
}

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full';

function fullName(p?: { firstName?: string; lastName?: string } | null) {
  if (!p) return '';
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

function patientName(p?: Patient | null) {
  return fullName(p) || '—';
}

function doctorName(d?: Doctor | null) {
  return fullName(d) || '—';
}

function recordDate(r: MedicalRecord) {
  return r.visitDate ?? r.visitAt ?? r.createdAt ?? null;
}

function recordSigned(r: MedicalRecord) {
  return Boolean(r.signed ?? r.isSigned);
}

function diagnoses(r: MedicalRecord): Diagnosis[] {
  return r.diagnoses ?? [];
}

const TABS = [
  { key: 'info', label: 'Información', icon: ClipboardList },
  { key: 'diag', label: 'Diagnósticos', icon: ClipboardList },
  { key: 'pres', label: 'Prescripciones', icon: Pill },
  { key: 'lab', label: 'Órdenes lab', icon: FlaskConical },
  { key: 'ver', label: 'Versiones', icon: History },
  { key: 'act', label: 'Acciones', icon: Edit },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function MedicalRecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('info');

  const [versions, setVersions] = useState<Version[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);

  async function loadRecord() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.medicalRecords.get(id);
      setRecord((res.data ?? null) as MedicalRecord | null);
    } catch (e) {
      console.error(e);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions() {
    if (!id) return;
    try {
      const res = await api.medicalRecords.versions(id);
      setVersions((res.data ?? []) as Version[]);
    } catch {
      setVersions([]);
    }
  }

  async function loadRelated() {
    if (!record) return;
    setDataLoading(true);
    try {
      const [pres, lab] = await Promise.all([
        api.prescriptions.byPatient(record.patient?.id ?? record.patientId ?? ''),
        api.lab.list(),
      ]);
      setPrescriptions(((pres.data ?? []) as Prescription[]).filter((p) => p.medicalRecordId === id));
      setLabOrders(((lab.data ?? []) as LabOrder[]).filter((l) => l.medicalRecordId === id));
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    loadRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!record) return;
    loadVersions();
    loadRelated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  async function handleSign() {
    if (!record) return;
    try {
      await api.medicalRecords.update(record.id, {
        signed: true,
        signedAt: new Date().toISOString(),
        signatureUrl: `mock://signatures/${record.id}`,
      });
      await loadRecord();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Cargando historia clínica...</p>;
  }
  if (!record) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/medical-records')}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <p className="text-slate-500">No se encontró la historia clínica.</p>
      </div>
    );
  }

  const signed = recordSigned(record);

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/medical-records')}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patientName(record.patient)}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Visita: {formatDate(recordDate(record), true)} · Doctor: {doctorName(record.doctor)}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              signed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600',
            )}
          >
            {signed ? 'Firmada' : 'Sin firmar'}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'info' && <InfoTab record={record} />}
          {tab === 'diag' && <DiagnosesTab record={record} />}
          {tab === 'pres' && <PrescriptionsTab items={prescriptions} loading={dataLoading} />}
          {tab === 'lab' && <LabTab items={labOrders} loading={dataLoading} />}
          {tab === 'ver' && <VersionsTab versions={versions} />}
          {tab === 'act' && (
            <ActionsTab
              record={record}
              onSign={handleSign}
              onEdit={() => setEditModalOpen(true)}
            />
          )}
        </div>
      </div>

      <EditRecordModal
        open={editModalOpen}
        record={record}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => {
          setEditModalOpen(false);
          loadRecord();
          loadVersions();
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function InfoTab({ record }: { record: MedicalRecord }) {
  const sv = record.signosVitales ?? {};
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Motivo de consulta" value={record.motivo} />
        <Field
          label="Fecha visita"
          value={formatDate(recordDate(record), true)}
        />
      </div>
      <Section title="Anamnesis">{record.anamnesis || '—'}</Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Alergias">{record.alergias || '—'}</Section>
        <Section title="Medicamentos actuales">{record.medicamentos || '—'}</Section>
        <Section title="Antecedentes personales">
          {record.antecedentesPersonales || '—'}
        </Section>
        <Section title="Antecedentes familiares">
          {record.antecedentesFamiliares || '—'}
        </Section>
      </div>
      <Section title="Examen físico">{record.examenFisico || '—'}</Section>
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Signos vitales
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Field
            label="Presión arterial"
            value={
              sv.bloodPressureSystolic || sv.bloodPressureDiastolic
                ? `${sv.bloodPressureSystolic ?? '—'}/${sv.bloodPressureDiastolic ?? '—'} mmHg`
                : null
            }
          />
          <Field label="Frec. cardíaca" value={sv.heartRate ? `${sv.heartRate} lpm` : null} />
          <Field label="Temperatura" value={sv.temperature ? `${sv.temperature} °C` : null} />
          <Field label="Frec. respiratoria" value={sv.respiratoryRate ? `${sv.respiratoryRate} rpm` : null} />
          <Field label="Saturación O₂" value={sv.oxygenSaturation ? `${sv.oxygenSaturation} %` : null} />
          <Field label="Peso" value={sv.weight ? `${sv.weight} kg` : null} />
          <Field label="Altura" value={sv.height ? `${sv.height} cm` : null} />
          <Field label="IMC" value={sv.bmi ? String(sv.bmi) : null} />
        </div>
      </div>
      <Section title="Tratamiento">{record.tratamiento || '—'}</Section>
      <Section title="Notas">{record.notas || '—'}</Section>
    </div>
  );
}

function DiagnosesTab({ record }: { record: MedicalRecord }) {
  const list = diagnoses(record);
  if (list.length === 0) {
    return <p className="text-sm text-slate-500">Sin diagnósticos registrados.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {list.map((d, i) => (
        <li key={d.id ?? i} className="flex items-center justify-between py-3 text-sm">
          <div>
            <span className="font-mono font-semibold text-primary-700">
              {d.cie10Code?.code ?? d.code ?? '—'}
            </span>
            <span className="ml-3 text-slate-800">
              {d.cie10Code?.description ?? d.description ?? '—'}
            </span>
          </div>
          {d.isPrimary && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              Principal
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function PrescriptionsTab({ items, loading }: { items: Prescription[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-slate-500">Cargando...</p>;
  if (items.length === 0)
    return <p className="text-sm text-slate-500">Sin prescripciones para esta consulta.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((p) => (
        <li key={p.id} className="flex items-center justify-between py-3 text-sm">
          <div>
            <p className="font-medium text-slate-900">Prescripción #{p.id.slice(0, 8)}</p>
            <p className="text-xs text-slate-500">{formatDate(p.issuedAt, true)}</p>
          </div>
          {p.status && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                statusColor(p.status),
              )}
            >
              {statusLabel(p.status)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function LabTab({ items, loading }: { items: LabOrder[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-slate-500">Cargando...</p>;
  if (items.length === 0)
    return <p className="text-sm text-slate-500">Sin órdenes de laboratorio.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((l) => (
        <li key={l.id} className="flex items-center justify-between py-3 text-sm">
          <div>
            <p className="font-medium text-slate-900">
              {l.examType?.name ?? l.examName ?? 'Examen'}
            </p>
            <p className="text-xs text-slate-500">
              {formatDate(l.createdAt, true)} {l.priority ? `· ${l.priority}` : ''}
            </p>
          </div>
          {l.status && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                statusColor(l.status),
              )}
            >
              {statusLabel(l.status)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function VersionsTab({ versions }: { versions: Version[] }) {
  if (versions.length === 0)
    return <p className="text-sm text-slate-500">Sin versiones registradas.</p>;
  return (
    <ol className="space-y-3">
      {versions.map((v, i) => (
        <li
          key={v.id ?? i}
          className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"
        >
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            v{v.version ?? i + 1}
          </span>
          <div className="flex-1">
            <p className="font-medium text-slate-900">
              {fullName(v.changedBy) || 'Sistema'}
            </p>
            <p className="text-xs text-slate-500">{formatDate(v.createdAt, true)}</p>
            {v.changeReason && (
              <p className="mt-1 text-sm text-slate-700">{v.changeReason}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ActionsTab({
  record,
  onSign,
  onEdit,
}: {
  record: MedicalRecord;
  onSign: () => void;
  onEdit: () => void;
}) {
  const signed = recordSigned(record);
  return (
    <div className="space-y-3">
      <button
        onClick={onSign}
        disabled={signed}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        <span className="flex items-center gap-2 font-medium text-slate-900">
          <FileSignature className="h-4 w-4 text-primary-600" />
          Firmar historia clínica
        </span>
        <span className="text-xs text-slate-500">{signed ? 'Ya firmada' : 'Disponible'}</span>
      </button>
      <button
        onClick={onEdit}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 font-medium text-slate-900">
          <Edit className="h-4 w-4 text-primary-600" />
          Editar historia
        </span>
        <span className="text-xs text-slate-500">PUT update</span>
      </button>
      <Link
        href={`/patients/${record.patient?.id ?? record.patientId ?? ''}`}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 font-medium text-slate-900">
          <History className="h-4 w-4 text-primary-600" />
          Ver timeline del paciente
        </span>
        <span className="text-xs text-slate-500">Abrir</span>
      </Link>
    </div>
  );
}

function EditRecordModal({
  open,
  record,
  onClose,
  onSaved,
}: {
  open: boolean;
  record: MedicalRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [motivo, setMotivo] = useState(record.motivo ?? '');
  const [anamnesis, setAnamnesis] = useState(record.anamnesis ?? '');
  const [alergias, setAlergias] = useState(record.alergias ?? '');
  const [medicamentos, setMedicamentos] = useState(record.medicamentos ?? '');
  const [examenFisico, setExamenFisico] = useState(record.examenFisico ?? '');
  const [tratamiento, setTratamiento] = useState(record.tratamiento ?? '');
  const [notas, setNotas] = useState(record.notas ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMotivo(record.motivo ?? '');
    setAnamnesis(record.anamnesis ?? '');
    setAlergias(record.alergias ?? '');
    setMedicamentos(record.medicamentos ?? '');
    setExamenFisico(record.examenFisico ?? '');
    setTratamiento(record.tratamiento ?? '');
    setNotas(record.notas ?? '');
  }, [record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.medicalRecords.update(record.id, {
        motivo,
        anamnesis,
        alergias,
        medicamentos,
        examenFisico,
        tratamiento,
        notas,
        changeReason: 'Edición rápida',
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-10 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Editar historia clínica</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Anamnesis</label>
            <textarea
              value={anamnesis}
              onChange={(e) => setAnamnesis(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Alergias</label>
              <textarea
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Medicamentos</label>
              <textarea
                value={medicamentos}
                onChange={(e) => setMedicamentos(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Examen físico</label>
            <textarea
              value={examenFisico}
              onChange={(e) => setExamenFisico(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tratamiento</label>
            <textarea
              value={tratamiento}
              onChange={(e) => setTratamiento(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}