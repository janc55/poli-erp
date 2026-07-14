'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  UserCheck,
  CalendarClock,
  XCircle,
  Play,
  Phone,
  Check,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { statusColor, statusLabel, calculateAge } from '@/lib/format';

type Tab = 'hoy' | 'todas' | 'espera' | 'consultorios';

interface Appointment {
  id: string;
  dateTime?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  status?: string;
  reason?: string;
  notes?: string;
  type?: 'IN_PERSON' | 'TELEMEDICINE' | string;
  patient?: { id: string; firstName?: string; lastName?: string; fullName?: string; birthDate?: string; documentId?: string };
  doctor?: { id: string; firstName?: string; lastName?: string; fullName?: string };
  specialty?: { id: string; name?: string };
  room?: { id: string; name?: string; number?: string };
  queueNumber?: number;
  arrivedAt?: string;
  waitingSince?: string;
}

interface Doctor {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}
interface Specialty { id: string; name: string }
interface Room { id: string; name?: string; number?: string }
interface Patient { id: string; firstName?: string; lastName?: string; fullName?: string; birthDate?: string; documentId?: string }

function patientName(a: Appointment): string {
  if (a.patient?.fullName) return a.patient.fullName;
  if (a.patient) return `${a.patient.firstName ?? ''} ${a.patient.lastName ?? ''}`.trim() || '—';
  return '—';
}
function doctorName(a: Appointment | { doctor?: Doctor }): string {
  const d = (a as Appointment).doctor;
  if (!d) return '—';
  if (d.fullName) return d.fullName;
  return `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || '—';
}
function roomName(a: Appointment): string {
  if (!a.room) return '—';
  return a.room.name ?? a.room.number ?? '—';
}
function appointmentTime(a: Appointment): string {
  const raw = a.dateTime ?? a.startTime;
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

// ─── Modal shell ───────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const widths = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={cn('w-full rounded-xl bg-white shadow-xl', widths[size])}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(status))}>
      {statusLabel(status)}
    </span>
  );
}

// ─── Side panel for asking reasons / new date ──────────────────────────
function PromptModal({
  open, onClose, title, onConfirm, confirmLabel = 'Confirmar',
  withDateTime = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onConfirm: (value: { reason: string; newDateTime?: string }) => void;
  confirmLabel?: string;
  withDateTime?: boolean;
}) {
  const [reason, setReason] = useState('');
  const [dt, setDt] = useState('');

  useEffect(() => {
    if (open) { setReason(''); setDt(''); }
  }, [open]);

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {withDateTime && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nueva fecha y hora</label>
            <input
              type="datetime-local"
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Detalle del motivo..."
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ reason: reason.trim(), newDateTime: dt || undefined })}
            disabled={(withDateTime && !dt)}
            className="bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Patient search select ─────────────────────────────────────────────
function PatientSearch({ value, onChange }: { value: string; onChange: (id: string, p: Patient | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  useEffect(() => {
    if (!q || q.length < 1) { setResults([]); return; }
    let active = true;
    const t = setTimeout(() => {
      api.patients.search(q)
        .then((res) => { if (active) setResults(Array.isArray(res.data) ? (res.data as Patient[]) : []); })
        .catch(() => { if (active) setResults([]); });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="relative">
      <input
        type="text"
        value={selected ? patientName({ patient: selected } as Appointment) : q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setSelected(null); onChange('', null); setOpen(true); }}
        placeholder="Buscar por nombre o cédula..."
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setSelected(p); onChange(p.id, p); setOpen(false); setQ(''); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <div className="font-medium text-slate-900">{patientName({ patient: p } as Appointment)}</div>
              <div className="text-xs text-slate-500">
                {p.documentId ? `Cédula: ${p.documentId}` : ''}
                {p.birthDate ? ` · ${calculateAge(p.birthDate)} años` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New appointment modal ─────────────────────────────────────────────
function NewAppointmentModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [type, setType] = useState<'IN_PERSON' | 'TELEMEDICINE'>('IN_PERSON');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    api.users.doctors().then((r) => setDoctors(Array.isArray(r.data) ? (r.data as Doctor[]) : [])).catch(() => {});
    api.specialties.list().then((r) => setSpecialties(Array.isArray(r.data) ? (r.data as Specialty[]) : [])).catch(() => {});
    api.rooms.list().then((r) => setRooms(Array.isArray(r.data) ? (r.data as Room[]) : [])).catch(() => {});
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || !doctorId || !specialtyId || !dateTime) {
      setError('Paciente, doctor, especialidad y fecha son obligatorios');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.appointments.create({
        patientId,
        doctorId,
        specialtyId,
        roomId: roomId || undefined,
        dateTime: new Date(dateTime).toISOString(),
        duration: Number(duration),
        type,
        reason: reason || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cita');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva cita" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Paciente *</label>
          <PatientSearch value={patientId} onChange={(id) => setPatientId(id)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Doctor *</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
            >
              <option value="">Seleccionar...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{doctorName({ doctor: d })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Especialidad *</label>
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
            >
              <option value="">Seleccionar...</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Consultorio</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
            >
              <option value="">Sin asignar</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name ?? r.number ?? r.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha y hora *</label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Duración</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'IN_PERSON' | 'TELEMEDICINE')}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
            >
              <option value="IN_PERSON">Presencial</option>
              <option value="TELEMEDICINE">Telemedicina</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear cita'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Notes prompt (used by queue.complete / noShow) ────────────────────
function NotesPrompt({ open, onClose, onConfirm, title }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  title: string;
}) {
  const [notes, setNotes] = useState('');
  useEffect(() => { if (open) setNotes(''); }, [open]);
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notas (opcional)"
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(notes.trim())}
            className="bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-4 py-2 text-sm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ─── Main component ───────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [tab, setTab] = useState<Tab>('hoy');

  const [todayData, setTodayData] = useState<Appointment[]>([]);
  const [allItems, setAllItems] = useState<Appointment[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [waiting, setWaiting] = useState<Appointment[]>([]);
  const [occupancy, setOccupancy] = useState<Array<Record<string, unknown>>>([]);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [newOpen, setNewOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [reschedTarget, setReschedTarget] = useState<Appointment | null>(null);
  const [notesTarget, setNotesTarget] = useState<null | { kind: 'complete' | 'noShow'; item: Appointment }>(null);

  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const lastDataRef = useRef<Record<string, string>>({});

  // polling
  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      refreshPolling();
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { active = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPolling() {
    try {
      const [t, w] = await Promise.allSettled([
        api.appointments.today(),
        api.appointments.waitingList(),
      ]);
      if (t.status === 'fulfilled') {
        const items = extractItems(t.value.data);
        setTodayData(items);
        flashIfChanged('today', items);
      }
      if (w.status === 'fulfilled') {
        const items = extractItems(w.value.data);
        setWaiting(items);
        flashIfChanged('waiting', items);
      }
    } catch (e) {
      console.error('poll error', e);
    }
  }

  function extractItems(data: unknown): Appointment[] {
    if (Array.isArray(data)) return data as Appointment[];
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items as Appointment[];
      if (Array.isArray(obj.data)) return obj.data as Appointment[];
      if (Array.isArray(obj.appointments)) return obj.appointments as Appointment[];
    }
    return [];
  }

  function flashIfChanged(key: string, items: Appointment[]) {
    const sig = items.map((i) => `${i.id}:${i.status}:${i.queueNumber ?? ''}:${i.waitingSince ?? i.arrivedAt ?? ''}`).join('|');
    if (lastDataRef.current[key] && lastDataRef.current[key] !== sig) {
      setLoading((p) => ({ ...p, [key]: true }));
      setTimeout(() => setLoading((p) => ({ ...p, [key]: false })), 800);
    }
    lastDataRef.current[key] = sig;
  }

  // all list (Todas tab)
  async function fetchAll() {
    setLoading((p) => ({ ...p, all: true }));
    try {
      const res = await api.appointments.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
      } as Record<string, string | number>);
      const items = extractItems(res.data);
      setAllItems(items);
      const total = (res as unknown as { data: { total?: number } }).data?.total;
      setAllTotal(typeof total === 'number' ? total : items.length);
    } catch (e) {
      console.error('list error', e);
    } finally {
      setLoading((p) => ({ ...p, all: false }));
    }
  }
  useEffect(() => { if (tab === 'todas') fetchAll(); }, [tab, page, search, statusFilter]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // occupancy
  useEffect(() => {
    if (tab !== 'consultorios') return;
    let active = true;
    const load = () => api.queue.occupancy()
      .then((r) => { if (active) setOccupancy(Array.isArray(r.data) ? (r.data as Array<Record<string, unknown>>) : []); })
      .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => { active = false; clearInterval(id); };
  }, [tab]);

  // ─── Actions ─────────────────────────────────────────────────────
  async function actConfirm(a: Appointment) {
    setLoading((p) => ({ ...p, [a.id]: true }));
    try { await api.appointments.confirm(a.id); await refreshPolling(); if (tab === 'todas') fetchAll(); }
    catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }
  async function actCheckIn(a: Appointment) {
    setLoading((p) => ({ ...p, [a.id]: true }));
    try { await api.appointments.checkIn(a.id); await refreshPolling(); if (tab === 'todas') fetchAll(); }
    catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }
  async function actCancel(a: Appointment, reason: string) {
    if (!reason) return;
    setLoading((p) => ({ ...p, [a.id]: true }));
    try { await api.appointments.cancel(a.id, reason); setCancelTarget(null); await refreshPolling(); if (tab === 'todas') fetchAll(); }
    catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }
  async function actReschedule(a: Appointment, newDateTime: string, reason?: string) {
    if (!newDateTime) return;
    setLoading((p) => ({ ...p, [a.id]: true }));
    try {
      await api.appointments.reschedule(a.id, new Date(newDateTime).toISOString(), reason);
      setReschedTarget(null);
      await refreshPolling();
      if (tab === 'todas') fetchAll();
    } catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }
  async function actStartConsultation(a: Appointment) {
    setLoading((p) => ({ ...p, [a.id]: true }));
    try { await api.queue.call(a.id); await refreshPolling(); if (tab === 'todas') fetchAll(); }
    catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }

  // queue actions
  async function actQueueCall(a: Appointment) {
    setLoading((p) => ({ ...p, [a.id]: true }));
    try { await api.queue.call(a.id); await refreshPolling(); }
    catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }
  async function actQueueComplete(a: Appointment, notes?: string) {
    setLoading((p) => ({ ...p, [a.id]: true }));
    try { await api.queue.complete(a.id, notes); setNotesTarget(null); await refreshPolling(); }
    catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }
  async function actQueueNoShow(a: Appointment, notes?: string) {
    setLoading((p) => ({ ...p, [a.id]: true }));
    try { await api.queue.noShow(a.id, notes); setNotesTarget(null); await refreshPolling(); }
    catch (e) { console.error(e); }
    finally { setLoading((p) => ({ ...p, [a.id]: false })); }
  }

  // ─── Derived ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = todayData.length;
    const waitingCount = waiting.length;
    const inProg = todayData.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'IN_CONSULTATION').length;
    return { today, waiting: waitingCount, inProgress: inProg };
  }, [todayData, waiting]);

  const waitingBySpecialty = useMemo(() => {
    const map = new Map<string, { name: string; items: Appointment[] }>();
    waiting.forEach((a) => {
      const key = a.specialty?.id ?? 'none';
      const name = a.specialty?.name ?? 'Sin especialidad';
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(a);
    });
    return Array.from(map.values()).map((g) => ({
      ...g,
      items: g.items.slice().sort((x, y) => (x.queueNumber ?? 0) - (y.queueNumber ?? 0)),
    }));
  }, [waiting]);

  const totalPages = Math.max(1, Math.ceil(allTotal / limit));

  // ─── UI ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Citas</h1>
          <p className="text-sm text-slate-500">Gestión de agenda, cola OPD y consultorios</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { refreshPolling(); if (tab === 'todas') fetchAll(); }}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-3 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Nueva cita
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-700">Citas hoy</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">{stats.today}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-700">En espera OPD</p>
          <p className="mt-1 text-3xl font-bold text-amber-900">{stats.waiting}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-5">
          <p className="text-sm font-medium text-purple-700">En consulta</p>
          <p className="mt-1 text-3xl font-bold text-purple-900">{stats.inProgress}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {([
            { k: 'hoy', l: 'Hoy' },
            { k: 'todas', l: 'Todas' },
            { k: 'espera', l: 'En espera (OPD)' },
            { k: 'consultorios', l: 'Consultorios' },
          ] as { k: Tab; l: string }[]).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                tab === t.k
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
            >
              {t.l}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Hoy ─────────────────────────────────────────────────── */}
      {tab === 'hoy' && (
        <div className={cn('rounded-xl border border-slate-200 bg-white', loading.today && 'ring-2 ring-primary-200')}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-slate-900">Agenda de hoy</h2>
            <span className="text-xs text-slate-500">Actualiza cada 5s</span>
          </div>
          <AppointmentTable rows={todayData} busy={loading} onConfirm={actConfirm} onCheckIn={actCheckIn}
            onCancel={(a) => setCancelTarget(a)} onReschedule={(a) => setReschedTarget(a)} onStart={actStartConsultation}
            showPatientLink
          />
        </div>
      )}

      {/* ── Todas ──────────────────────────────────────────────── */}
      {tab === 'todas' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por paciente..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Todos los estados</option>
              <option value="SCHEDULED">Programada</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="CHECKED_IN">En sala de espera</option>
              <option value="IN_PROGRESS">En consulta</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="NO_SHOW">No asistió</option>
            </select>
            <span className="text-sm text-slate-500">{allTotal} resultados</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            <AppointmentTable rows={allItems} busy={loading} onConfirm={actConfirm} onCheckIn={actCheckIn}
              onCancel={(a) => setCancelTarget(a)} onReschedule={(a) => setReschedTarget(a)} onStart={actStartConsultation}
              showPatientLink
            />
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm">
              <span className="text-slate-500">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50 hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50 hover:bg-slate-50">
                  Siguiente <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── En espera (OPD) ───────────────────────────────────── */}
      {tab === 'espera' && (
        <div className={cn('space-y-4', loading.waiting && 'ring-2 ring-primary-200 rounded-xl')}>
          {waitingBySpecialty.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              No hay pacientes en espera.
            </div>
          ) : waitingBySpecialty.map((g) => (
            <div key={g.name} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="font-semibold text-slate-900">{g.name}</h3>
                <span className="text-xs text-slate-500">{g.items.length} en espera</span>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-white text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2">Turno</th>
                    <th className="px-5 py-2">Paciente</th>
                    <th className="px-5 py-2">Doctor</th>
                    <th className="px-5 py-2">Espera</th>
                    <th className="px-5 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {g.items.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                          {a.queueNumber ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        <Link href={`/appointments/${a.id}`} className="hover:text-primary-700">
                          {patientName(a)}
                        </Link>
                        {a.patient?.birthDate && (
                          <div className="text-xs text-slate-500">{calculateAge(a.patient.birthDate)} años</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-700">{doctorName(a)}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {a.waitingSince || a.arrivedAt ? (
                          <WaitingSince since={a.waitingSince ?? a.arrivedAt ?? ''} />
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => actQueueCall(a)} disabled={loading[a.id]}
                            className="flex items-center gap-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700 px-2.5 py-1.5 text-xs disabled:opacity-50">
                            <Phone className="h-3.5 w-3.5" /> Llamar
                          </button>
                          <button onClick={() => setNotesTarget({ kind: 'complete', item: a })} disabled={loading[a.id]}
                            className="flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1.5 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50">
                            <Check className="h-3.5 w-3.5" /> Completar
                          </button>
                          <button onClick={() => setNotesTarget({ kind: 'noShow', item: a })} disabled={loading[a.id]}
                            className="flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50">
                            <SkipForward className="h-3.5 w-3.5" /> No show
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── Consultorios ─────────────────────────────────────── */}
      {tab === 'consultorios' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {occupancy.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              No hay consultorios configurados.
            </div>
          ) : occupancy.map((r, idx) => {
            const name = (r.name ?? r.roomName ?? r.number ?? 'Consultorio') as string;
            const occupied = Boolean(r.occupied ?? r.isOccupied ?? r.currentPatient);
            const patient = (r.currentPatient ?? r.patient) as Appointment['patient'] | undefined;
            const doctor = (r.doctor) as Appointment['doctor'] | undefined;
            return (
              <div key={(r.id as string) ?? `${name}-${idx}`}
                className={cn(
                  'rounded-xl border bg-white p-5 shadow-sm',
                  occupied ? 'border-amber-300' : 'border-slate-200',
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{name}</h3>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    occupied ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700',
                  )}>
                    {occupied ? 'Ocupado' : 'Libre'}
                  </span>
                </div>
                {doctor && (
                  <p className="mt-1 text-xs text-slate-500">Dr. {doctorName({ doctor })}</p>
                )}
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                  {occupied && patient ? (
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{patient.fullName ?? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim()}</p>
                      {(r.queueNumber ?? r.turn) != null && (
                        <p className="text-xs text-slate-500">Turno #{r.queueNumber ?? r.turn}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400">Sin paciente asignado</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      <NewAppointmentModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => { refreshPolling(); if (tab === 'todas') fetchAll(); }} />
      <PromptModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget ? `Cancelar cita de ${patientName(cancelTarget)}` : 'Cancelar cita'}
        confirmLabel="Cancelar cita"
        onConfirm={({ reason }) => cancelTarget && actCancel(cancelTarget, reason)}
      />
      <PromptModal
        open={!!reschedTarget}
        onClose={() => setReschedTarget(null)}
        title={reschedTarget ? `Reagendar cita de ${patientName(reschedTarget)}` : 'Reagendar cita'}
        confirmLabel="Reagendar"
        withDateTime
        onConfirm={({ reason, newDateTime }) => reschedTarget && actReschedule(reschedTarget, newDateTime ?? '', reason)}
      />
      <NotesPrompt
        open={!!notesTarget}
        onClose={() => setNotesTarget(null)}
        title={notesTarget?.kind === 'complete' ? 'Completar atención' : 'Marcar no show'}
        onConfirm={(notes) => {
          if (!notesTarget) return;
          if (notesTarget.kind === 'complete') actQueueComplete(notesTarget.item, notes);
          else actQueueNoShow(notesTarget.item, notes);
        }}
      />
    </div>
  );
}

// ─── Reusable appointment table ────────────────────────────────────────
function AppointmentTable({
  rows, busy, onConfirm, onCheckIn, onCancel, onReschedule, onStart, showPatientLink,
}: {
  rows: Appointment[];
  busy: Record<string, boolean | undefined>;
  onConfirm: (a: Appointment) => void;
  onCheckIn: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onReschedule: (a: Appointment) => void;
  onStart: (a: Appointment) => void;
  showPatientLink?: boolean;
}) {
  if (rows.length === 0) {
    return <div className="p-10 text-center text-sm text-slate-500">Sin resultados.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Hora</th>
            <th className="px-5 py-3">Paciente</th>
            <th className="px-5 py-3">Doctor</th>
            <th className="px-5 py-3">Especialidad</th>
            <th className="px-5 py-3">Consultorio</th>
            <th className="px-5 py-3">Estado</th>
            <th className="px-5 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-5 py-3 font-mono text-slate-700">{appointmentTime(a)}</td>
              <td className="px-5 py-3">
                {showPatientLink ? (
                  <Link href={`/appointments/${a.id}`} className="font-medium text-slate-900 hover:text-primary-700">
                    {patientName(a)}
                  </Link>
                ) : patientName(a)}
                {a.patient?.birthDate && (
                  <div className="text-xs text-slate-500">{calculateAge(a.patient.birthDate)} años</div>
                )}
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-slate-700">{doctorName(a)}</td>
              <td className="px-5 py-3 text-slate-700">{a.specialty?.name ?? '—'}</td>
              <td className="px-5 py-3 text-slate-700">{roomName(a)}</td>
              <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap justify-end gap-1">
                  {a.status === 'SCHEDULED' && (
                    <button onClick={() => onConfirm(a)} disabled={busy[a.id]}
                      className="flex items-center gap-1 rounded-lg border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                    </button>
                  )}
                  {(a.status === 'CONFIRMED' || a.status === 'SCHEDULED') && (
                    <button onClick={() => onCheckIn(a)} disabled={busy[a.id]}
                      className="flex items-center gap-1 rounded-lg border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                      <UserCheck className="h-3.5 w-3.5" /> Check-in
                    </button>
                  )}
                  {a.status === 'CHECKED_IN' && (
                    <button onClick={() => onStart(a)} disabled={busy[a.id]}
                      className="flex items-center gap-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 px-2 py-1 text-xs disabled:opacity-50">
                      <Play className="h-3.5 w-3.5" /> Iniciar consulta
                    </button>
                  )}
                  {['SCHEDULED', 'CONFIRMED'].includes(a.status ?? '') && (
                    <button onClick={() => onReschedule(a)} disabled={busy[a.id]}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      <CalendarClock className="h-3.5 w-3.5" /> Reagendar
                    </button>
                  )}
                  {!['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(a.status ?? '') && (
                    <button onClick={() => onCancel(a)} disabled={busy[a.id]}
                      className="flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" /> Cancelar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Waiting since indicator ──────────────────────────────────────────
function WaitingSince({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const start = new Date(since).getTime();
  if (isNaN(start)) return <span>—</span>;
  const diff = Math.max(0, Math.floor((now - start) / 60000));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return <span>{h > 0 ? `${h}h ${m}m` : `${m}m`}</span>;
}

