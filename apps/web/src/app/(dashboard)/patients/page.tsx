'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { calculateAge } from '@/lib/format';

interface Patient {
  id: string;
  dni?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  isActive?: boolean;
  active?: boolean;
}

interface PatientFormData {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  phone: string;
}

const emptyForm: PatientFormData = {
  dni: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: 'M',
  phone: '',
};

const GENDER_LABELS: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  OTHER: 'Otro',
};

function genderLabel(g: string) {
  return GENDER_LABELS[g?.toUpperCase()] ?? g ?? '—';
}

function genderColor(g: string) {
  const upper = g?.toUpperCase();
  if (upper === 'M' || upper === 'MALE') return 'bg-blue-100 text-blue-700';
  if (upper === 'F' || upper === 'FEMALE') return 'bg-pink-100 text-pink-700';
  return 'bg-slate-100 text-slate-700';
}

function isActive(p: Patient) {
  return p.isActive ?? p.active ?? true;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patients.list({
        page,
        limit,
        ...(search ? { search } : {}),
      });
      setPatients((res.data ?? []) as Patient[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function deactivate(p: Patient) {
    if (!confirm(`¿Desactivar al paciente ${p.firstName ?? ''} ${p.lastName ?? ''}?`)) return;
    try {
      await api.patients.deactivate(p.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acción fallida');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión de pacientes registrados
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Nuevo paciente
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar por DNI o nombre..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full sm:max-w-sm"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Género</th>
              <th className="px-4 py-3">Edad</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando pacientes...
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron pacientes.
                </td>
              </tr>
            ) : (
              patients.map((p) => {
                const name =
                  (p.fullName ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()) || '—';
                const age = p.birthDate ? calculateAge(p.birthDate) : null;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono text-xs">{p.dni ?? '—'}</td>
                    <td className="px-4 py-3">{name}</td>
                    <td className="px-4 py-3">{p.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          genderColor(p.gender ?? ''),
                        )}
                      >
                        {genderLabel(p.gender ?? '')}
                      </span>
                    </td>
                    <td className="px-4 py-3">{age !== null ? `${age} años` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {isActive(p) ? (
                        <button
                          type="button"
                          onClick={() => deactivate(p)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Inactivo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Página {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={patients.length < limit}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Siguiente
          </button>
        </div>
      </div>

      {modalOpen && (
        <PatientModal
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function PatientModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<PatientFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof PatientFormData>(key: K, value: PatientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.dni.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.birthDate) {
      setError('DNI, nombres, apellidos y fecha de nacimiento son obligatorios.');
      return;
    }

    try {
      setSubmitting(true);
      await api.patients.create({
        dni: form.dni.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate,
        gender: form.gender,
        phone: form.phone.trim() || undefined,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Nuevo paciente</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">DNI</span>
              <input
                type="text"
                required
                value={form.dni}
                onChange={(e) => setField('dni', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Nombres</span>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Apellidos</span>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Fecha de nacimiento
              </span>
              <input
                type="date"
                required
                value={form.birthDate}
                onChange={(e) => setField('birthDate', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Género</span>
              <select
                required
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Teléfono</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : 'Crear paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}