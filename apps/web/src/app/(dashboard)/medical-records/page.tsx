'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, FileText, Plus, Search, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  documentId?: string;
}
interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}
interface Cie10Item {
  cie10Code?: { code: string; description: string };
  code?: string;
  description?: string;
}
interface MedicalRecord {
  id: string;
  visitDate?: string;
  visitAt?: string;
  createdAt?: string;
  patient?: Patient;
  doctor?: Doctor;
  motivo?: string;
  reason?: string;
  signed?: boolean;
  isSigned?: boolean;
  diagnoses?: Cie10Item[];
  diagnosticos?: Cie10Item[];
}
interface Cie10Code {
  id?: string;
  code: string;
  description: string;
}
interface Appointment {
  id: string;
  scheduledAt?: string;
  date?: string;
  startTime?: string;
  patient?: Patient;
  patientId?: string;
  doctor?: Doctor;
  motivo?: string;
  status?: string;
}

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full';

function patientName(p?: Patient | null) {
  if (!p) return '—';
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—';
}

function doctorName(d?: Doctor | null) {
  if (!d) return '—';
  return `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || '—';
}

function recordDate(r: MedicalRecord) {
  return r.visitDate ?? r.visitAt ?? r.createdAt ?? null;
}

function recordMotivo(r: MedicalRecord) {
  return r.motivo ?? r.reason ?? '';
}

function recordDiagnoses(r: MedicalRecord): Cie10Item[] {
  return r.diagnoses ?? r.diagnosticos ?? [];
}

function recordSigned(r: MedicalRecord) {
  return Boolean(r.signed ?? r.isSigned);
}

function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className={cn('mt-10 w-full rounded-xl bg-white shadow-xl', sizes[size])}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [openModal, setOpenModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.medicalRecords.list({
        page,
        limit: 10,
        ...(search ? { search } : {}),
      });
      const data = (res.data ?? []) as unknown as MedicalRecord[] | PaginatedData<MedicalRecord>;
      if (Array.isArray(data)) {
        setRecords(data);
        setTotal(data.length);
        setTotalPages(1);
      } else if (data && Array.isArray((data as PaginatedData<MedicalRecord>).items)) {
        const p = data as PaginatedData<MedicalRecord>;
        setRecords(p.items);
        setTotal(p.meta?.total ?? p.items.length);
        setTotalPages(p.meta?.totalPages ?? 1);
      } else {
        setRecords([]);
      }
    } catch (e) {
      console.error(e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historias Clínicas</h1>
          <p className="text-sm text-slate-500">HCE electrónicas del policonsultorio</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva historia
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por paciente..."
                className={cn(inputClass, 'pl-9')}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Diagnósticos</th>
                <th className="px-4 py-3">Firmado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No se encontraron historias clínicas.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatDate(recordDate(r), true)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {patientName(r.patient)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{doctorName(r.doctor)}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={recordMotivo(r)}>
                      {recordMotivo(r) || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {recordDiagnoses(r).slice(0, 3).map((d, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {d.cie10Code?.code ?? d.code}
                          </span>
                        ))}
                        {recordDiagnoses(r).length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            +{recordDiagnoses(r).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {recordSigned(r) ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Sí
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/medical-records/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>
            {total > 0 ? `Mostrando ${records.length} de ${total}` : 'Sin resultados'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <span>
              Página {page} / {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <NewRecordModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          load();
        }}
      />
    </div>
  );
}

interface PaginatedData<T> {
  items: T[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

function NewRecordModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [patientQuery, setPatientQuery] = useState('');
  const [patientOptions, setPatientOptions] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentOptions, setAppointmentOptions] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 16));
  const [motivo, setMotivo] = useState('');
  const [anamnesis, setAnamnesis] = useState('');
  const [alergias, setAlergias] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [antecedentesPersonales, setAntecedentesPersonales] = useState('');
  const [antecedentesFamiliares, setAntecedentesFamiliares] = useState('');
  const [examenFisico, setExamenFisico] = useState('');
  const [sistolica, setSistolica] = useState('');
  const [diastolica, setDiastolica] = useState('');
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [frecuenciaRespiratoria, setFrecuenciaRespiratoria] = useState('');
  const [saturacion, setSaturacion] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [notas, setNotas] = useState('');

  const [cieQuery, setCieQuery] = useState('');
  const [cieResults, setCieResults] = useState<Cie10Code[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<Cie10Code[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (patientQuery.length < 2) {
        setPatientOptions([]);
        return;
      }
      try {
        const res = await api.patients.search(patientQuery);
        setPatientOptions((res.data ?? []) as Patient[]);
      } catch {
        setPatientOptions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, open]);

  useEffect(() => {
    if (!open || !patient) {
      setAppointmentOptions([]);
      setAppointment(null);
      return;
    }
    setLoadingAppts(true);
    api.appointments
      .list({ patientId: patient.id, limit: 20 })
      .then((res) => {
        const list = (res.data ?? []) as Appointment[];
        setAppointmentOptions(list);
      })
      .catch(() => setAppointmentOptions([]))
      .finally(() => setLoadingAppts(false));
  }, [patient, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (cieQuery.length < 2) {
        setCieResults([]);
        return;
      }
      try {
        const res = await api.cie10.search(cieQuery);
        setCieResults((res.data ?? []) as Cie10Code[]);
      } catch {
        setCieResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [cieQuery, open]);

  function addDiagnostico(c: Cie10Code) {
    if (diagnosticos.some((d) => d.code === c.code)) return;
    setDiagnosticos([...diagnosticos, c]);
    setCieQuery('');
    setCieResults([]);
  }

  function removeDiagnostico(code: string) {
    setDiagnosticos(diagnosticos.filter((d) => d.code !== code));
  }

  function reset() {
    setPatient(null);
    setPatientQuery('');
    setPatientOptions([]);
    setAppointment(null);
    setAppointmentOptions([]);
    setFecha(new Date().toISOString().slice(0, 16));
    setMotivo('');
    setAnamnesis('');
    setAlergias('');
    setMedicamentos('');
    setAntecedentesPersonales('');
    setAntecedentesFamiliares('');
    setExamenFisico('');
    setSistolica('');
    setDiastolica('');
    setFrecuenciaCardiaca('');
    setTemperatura('');
    setFrecuenciaRespiratoria('');
    setSaturacion('');
    setPeso('');
    setAltura('');
    setTratamiento('');
    setNotas('');
    setDiagnosticos([]);
    setCieQuery('');
    setCieResults([]);
    setError('');
  }

  function num(v: string): number | null {
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) {
      setError('Selecciona un paciente');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const vitales: Record<string, number> = {};
      const bp1 = num(sistolica);
      const bp2 = num(diastolica);
      if (bp1 !== null || bp2 !== null) {
        vitales.bloodPressureSystolic = bp1 ?? 0;
        vitales.bloodPressureDiastolic = bp2 ?? 0;
      }
      const hr = num(frecuenciaCardiaca);
      if (hr !== null) vitales.heartRate = hr;
      const t = num(temperatura);
      if (t !== null) vitales.temperature = t;
      const rr = num(frecuenciaRespiratoria);
      if (rr !== null) vitales.respiratoryRate = rr;
      const o2 = num(saturacion);
      if (o2 !== null) vitales.oxygenSaturation = o2;
      const w = num(peso);
      if (w !== null) vitales.weight = w;
      const h = num(altura);
      if (h !== null) vitales.height = h;

      await api.medicalRecords.create({
        patientId: patient.id,
        appointmentId: appointment?.id ?? null,
        visitDate: fecha,
        motivo,
        anamnesis,
        alergias,
        medicamentos,
        antecedentesPersonales,
        antecedentesFamiliares,
        examenFisico,
        signosVitales: vitales,
        tratamiento,
        notas,
        diagnoses: diagnosticos.map((d, i) => ({
          cie10CodeId: d.id ?? null,
          code: d.code,
          description: d.description,
          isPrimary: i === 0,
        })),
      });
      reset();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva historia clínica" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Paciente <span className="text-red-500">*</span>
            </label>
            {patient ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-900">{patientName(patient)}</span>
                <button
                  type="button"
                  onClick={() => setPatient(null)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Buscar paciente por nombre o documento..."
                  className={inputClass}
                />
                {patientOptions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {patientOptions.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPatient(p);
                            setPatientOptions([]);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                        >
                          {patientName(p)}
                          {p.documentId ? (
                            <span className="ml-2 text-xs text-slate-500">{p.documentId}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cita (opcional)
            </label>
            <select
              value={appointment?.id ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                setAppointment(appointmentOptions.find((a) => a.id === id) ?? null);
              }}
              disabled={!patient || loadingAppts}
              className={cn(inputClass, 'disabled:bg-slate-50 disabled:text-slate-400')}
            >
              <option value="">— Sin cita asociada —</option>
              {appointmentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.scheduledAt ?? a.date ?? null, true)} ·{' '}
                  {a.motivo ?? a.status ?? ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha visita</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Motivo de consulta</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Diagnósticos (CIE-10)
          </label>
          <div className="relative">
            <input
              value={cieQuery}
              onChange={(e) => setCieQuery(e.target.value)}
              placeholder="Buscar código o descripción..."
              className={inputClass}
            />
            {cieResults.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {cieResults.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => addDiagnostico(c)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      <span className="font-mono font-semibold text-primary-700">{c.code}</span>{' '}
                      <span className="text-slate-700">{c.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {diagnosticos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {diagnosticos.map((d, i) => (
                <span
                  key={d.code}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {i === 0 ? <span className="text-blue-500">(P)</span> : null}
                  <span className="font-mono">{d.code}</span>
                  <span className="max-w-xs truncate">{d.description}</span>
                  <button
                    type="button"
                    onClick={() => removeDiagnostico(d.code)}
                    className="text-blue-500 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <details className="rounded-lg border border-slate-200 p-4" open>
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Anamnesis y antecedentes
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-600">Anamnesis</label>
              <textarea
                value={anamnesis}
                onChange={(e) => setAnamnesis(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Alergias</label>
              <textarea
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Medicamentos actuales</label>
              <textarea
                value={medicamentos}
                onChange={(e) => setMedicamentos(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Antecedentes personales</label>
              <textarea
                value={antecedentesPersonales}
                onChange={(e) => setAntecedentesPersonales(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-600">Antecedentes familiares</label>
              <textarea
                value={antecedentesFamiliares}
                onChange={(e) => setAntecedentesFamiliares(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>
        </details>

        <details className="rounded-lg border border-slate-200 p-4" open>
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Examen físico y signos vitales
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-600">Examen físico</label>
              <textarea
                value={examenFisico}
                onChange={(e) => setExamenFisico(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-slate-600">PA Sistólica</label>
                <input
                  type="number"
                  value={sistolica}
                  onChange={(e) => setSistolica(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">PA Diastólica</label>
                <input
                  type="number"
                  value={diastolica}
                  onChange={(e) => setDiastolica(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">FC (lpm)</label>
                <input
                  type="number"
                  value={frecuenciaCardiaca}
                  onChange={(e) => setFrecuenciaCardiaca(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperatura}
                  onChange={(e) => setTemperatura(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">FR (rpm)</label>
                <input
                  type="number"
                  value={frecuenciaRespiratoria}
                  onChange={(e) => setFrecuenciaRespiratoria(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Sat O₂ (%)</label>
                <input
                  type="number"
                  value={saturacion}
                  onChange={(e) => setSaturacion(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Altura (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </details>

        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Tratamiento y notas
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-600">Tratamiento</label>
              <textarea
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>
        </details>

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
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar historia'}
          </button>
        </div>
      </form>
    </Modal>
  );
}