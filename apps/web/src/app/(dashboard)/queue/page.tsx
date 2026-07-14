'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Phone, RefreshCw, Building2, Maximize2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { statusColor, calculateAge } from '@/lib/format';

interface QueueItem {
  id: string;
  queueNumber?: number;
  turn?: number;
  status?: string;
  patient?: { id: string; firstName?: string; lastName?: string; fullName?: string; birthDate?: string };
  doctor?: { id: string; firstName?: string; lastName?: string; fullName?: string };
  specialty?: { id: string; name?: string };
  waitingSince?: string;
  arrivedAt?: string;
}

interface Room {
  id?: string;
  name?: string;
  number?: string;
  roomName?: string;
  occupied?: boolean;
  isOccupied?: boolean;
  currentPatient?: QueueItem['patient'];
  patient?: QueueItem['patient'];
  doctor?: QueueItem['doctor'];
  queueNumber?: number;
  turn?: number;
}

function nameOf(p?: { firstName?: string; lastName?: string; fullName?: string }) {
  if (!p) return '—';
  if (p.fullName) return p.fullName;
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—';
}

function extractList(data: unknown): QueueItem[] {
  if (Array.isArray(data)) return data as QueueItem[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as QueueItem[];
    if (Array.isArray(obj.data)) return obj.data as QueueItem[];
  }
  return [];
}

export default function QueueLivePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const lastSigRef = useRef<string>('');
  const lastRoomSigRef = useRef<string>('');

  async function refresh() {
    setLoading((p) => ({ ...p, list: true }));
    try {
      const [q, o] = await Promise.allSettled([
        api.queue.list(),
        api.queue.occupancy(),
      ]);
      if (q.status === 'fulfilled') {
        const list = extractList(q.value.data);
        setItems(list);
        const sig = list.map((i) => `${i.id}:${i.status}:${i.queueNumber ?? i.turn ?? ''}`).join('|');
        if (lastSigRef.current && lastSigRef.current !== sig) {
          const prev = new Map(lastSigRef.current.split('|').filter(Boolean).map((s) => s.split(':')));
          const cur = new Map(sig.split('|').filter(Boolean).map((s) => s.split(':')));
          const changedIds: Record<string, boolean> = {};
          cur.forEach((v, k) => {
            const before = prev.get(k);
            if (!before || before.join(':') !== v.join(':')) changedIds[k] = true;
          });
          if (Object.keys(changedIds).length > 0) {
            setChanged(changedIds);
            setTimeout(() => setChanged({}), 1200);
          }
        }
        lastSigRef.current = sig;
      }
      if (o.status === 'fulfilled') {
        const list = Array.isArray(o.value.data) ? (o.value.data as Room[]) : [];
        setRooms(list);
        const sig = list.map((r) => `${r.id ?? r.name ?? ''}:${r.occupied ? 1 : 0}:${r.currentPatient?.id ?? r.patient?.id ?? ''}`).join('|');
        if (lastRoomSigRef.current && lastRoomSigRef.current !== sig) {
          setLoading((p) => ({ ...p, occ: true }));
          setTimeout(() => setLoading((p) => ({ ...p, occ: false })), 800);
        }
        lastRoomSigRef.current = sig;
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading((p) => ({ ...p, list: false }));
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; items: QueueItem[] }>();
    items.forEach((it) => {
      const key = it.specialty?.id ?? 'none';
      const name = it.specialty?.name ?? 'Sin especialidad';
      if (!map.has(key)) map.set(key, { id: key, name, items: [] });
      map.get(key)!.items.push(it);
    });
    return Array.from(map.values())
      .map((g) => ({ ...g, items: g.items.slice().sort((a, b) => (a.queueNumber ?? a.turn ?? 0) - (b.queueNumber ?? b.turn ?? 0)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const totals = useMemo(() => {
    const waiting = items.filter((i) => !i.status || i.status === 'WAITING' || i.status === 'CHECKED_IN').length;
    const inConsult = items.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'IN_CONSULTATION').length;
    return { total: items.length, waiting, inConsult };
  }, [items]);

  async function call(item: QueueItem) {
    setBusy((p) => ({ ...p, [item.id]: true }));
    try {
      await api.queue.call(item.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al llamar paciente');
    } finally {
      setBusy((p) => ({ ...p, [item.id]: false }));
    }
  }

  function requestFullscreen() {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cola OPD en vivo</h1>
          <p className="text-sm text-slate-500">Pantalla de turnos — auto-actualiza cada 5 segundos</p>
        </div>
        <div className="flex items-center gap-3">
          <PillStat label="En espera" value={totals.waiting} color="bg-amber-100 text-amber-700" />
          <PillStat label="En consulta" value={totals.inConsult} color="bg-purple-100 text-purple-700" />
          <PillStat label="Total" value={totals.total} color="bg-slate-100 text-slate-700" />
          <button onClick={requestFullscreen}
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
            title="Pantalla completa">
            <Maximize2 className="h-4 w-4" />
          </button>
          <button onClick={refresh}
            className={cn(
              'flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50',
              loading.list && 'opacity-60',
            )}>
            <RefreshCw className={cn('h-4 w-4', loading.list && 'animate-spin')} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT — waiting list */}
        <div className="lg:col-span-2 space-y-4">
          {grouped.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-16 text-center text-slate-500">
              No hay pacientes en espera.
            </div>
          ) : grouped.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
                <h3 className="text-lg font-semibold text-slate-900">{g.name}</h3>
                <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                  {g.items.length} en espera
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {g.items.map((it) => {
                  const isChanged = !!changed[it.id];
                  return (
                    <li key={it.id}
                      className={cn(
                        'flex items-center gap-4 px-6 py-4 transition-colors',
                        isChanged && 'animate-pulse bg-yellow-50',
                      )}>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white shadow">
                        {it.queueNumber ?? it.turn ?? '—'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/appointments/${it.id}`}
                          className="block truncate text-lg font-semibold text-slate-900 hover:text-primary-700">
                          {nameOf(it.patient)}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                          <span>Dr. {nameOf(it.doctor)}</span>
                          {it.patient?.birthDate && (
                            <span className="text-slate-500">{calculateAge(it.patient.birthDate)} años</span>
                          )}
                          {(it.waitingSince || it.arrivedAt) && (
                            <WaitingSince since={it.waitingSince ?? it.arrivedAt ?? ''} />
                          )}
                          {it.status && (
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColor(it.status))}>
                              {it.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => call(it)}
                        disabled={busy[it.id] || it.status === 'IN_PROGRESS' || it.status === 'IN_CONSULTATION'}
                        className="flex shrink-0 items-center gap-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                        <Phone className="h-4 w-4" />
                        Llamar a consulta
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* RIGHT — occupancy */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Building2 className="h-4 w-4" /> Ocupación de consultorios
          </h2>
          <div className={cn('grid gap-3 transition-shadow', loading.occ && 'rounded-xl ring-2 ring-primary-200')}>
            {rooms.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Sin consultorios.
              </div>
            ) : rooms.map((r, idx) => {
              const name = (r.name ?? r.roomName ?? r.number ?? 'Consultorio') as string;
              const occupied = Boolean(r.occupied ?? r.isOccupied);
              const patient = r.currentPatient ?? r.patient;
              const doctor = r.doctor;
              return (
                <div key={(r.id as string) ?? `${name}-${idx}`}
                  className={cn(
                    'rounded-xl border bg-white p-4 shadow-sm transition-colors',
                    occupied ? 'border-amber-300' : 'border-slate-200',
                  )}>
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
                    <p className="mt-1 text-xs text-slate-500">Dr. {nameOf(doctor)}</p>
                  )}
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {occupied && patient ? (
                      <div className="space-y-1">
                        <p className="truncate text-sm font-medium text-slate-900">{nameOf(patient)}</p>
                        {(r.queueNumber ?? r.turn) != null && (
                          <p className="text-xs text-slate-500">Turno #{r.queueNumber ?? r.turn}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Sin paciente asignado</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PillStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium', color)}>
      <span className="font-bold">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

function WaitingSince({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  const start = new Date(since).getTime();
  if (isNaN(start)) return null;
  const diff = Math.max(0, Math.floor((now - start) / 60000));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
      {h > 0 ? `${h}h ${m}m` : `${m}m`}
    </span>
  );
}
