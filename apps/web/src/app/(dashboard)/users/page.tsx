'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@poli-erp/shared';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  profile?: { title?: string; licenseNumber?: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  DOCTOR: 'Médico',
  NURSE: 'Enfermera',
  RECEPTION: 'Recepción',
  ACCOUNTING: 'Contable',
  PHARMACY: 'Farmacia',
  LAB: 'Laboratorio',
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-orange-100 text-orange-700',
  DOCTOR: 'bg-blue-100 text-blue-700',
  NURSE: 'bg-teal-100 text-teal-700',
  RECEPTION: 'bg-purple-100 text-purple-700',
  ACCOUNTING: 'bg-amber-100 text-amber-700',
  PHARMACY: 'bg-emerald-100 text-emerald-700',
  LAB: 'bg-pink-100 text-pink-700',
};

interface CreateUserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  role: Role;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    password: 'User123!',
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    role: Role.RECEPTION,
  });
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await api.users.list({ page: 1, limit: 100, search });
      setUsers((res.data as { data?: User[] }).data ?? (res.data as unknown as User[]));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.users.create(form);
      setShowCreate(false);
      setForm({
        email: '',
        password: 'User123!',
        firstName: '',
        lastName: '',
        dni: '',
        phone: '',
        role: Role.RECEPTION,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    }
  }

  async function toggleActive(u: User) {
    try {
      if (u.isActive) {
        await api.users.deactivate(u.id);
      } else {
        await api.users.activate(u.id);
      }
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  const canManage =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">Personal con acceso al sistema</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Nuevo usuario
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o DNI..."
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">DNI</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Estado</th>
              {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No hay usuarios
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{u.email}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                    {u.profile?.title && (
                      <span className="ml-2 text-xs text-slate-500">· {u.profile.title}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{u.dni}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${ROLE_COLOR[u.role] ?? 'bg-slate-100 text-slate-700'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        Inactivo
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(u)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium ${
                          u.isActive
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {u.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        ¿Necesitas cambiar tu contraseña?{' '}
        <Link href="/settings" className="text-primary-600 hover:underline">
          Ir a Configuración
        </Link>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Nuevo usuario</h2>
            <form onSubmit={createUser} className="space-y-3">
              {error && (
                <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <input
                type="email"
                placeholder="Email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombres"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Apellidos"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="DNI"
                  required
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value={Role.SUPER_ADMIN}>Super Admin</option>
                <option value={Role.ADMIN}>Administrador</option>
                <option value={Role.DOCTOR}>Médico</option>
                <option value={Role.NURSE}>Enfermera</option>
                <option value={Role.RECEPTION}>Recepción</option>
                <option value={Role.ACCOUNTING}>Contable</option>
                <option value={Role.PHARMACY}>Farmacia</option>
                <option value={Role.LAB}>Laboratorio</option>
              </select>
              <p className="text-xs text-slate-500">
                Contraseña inicial: <span className="font-mono">User123!</span>{' '}
                (puede cambiarla luego)
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
