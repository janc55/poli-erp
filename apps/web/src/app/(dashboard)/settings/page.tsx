'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'users';

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DOCTOR', label: 'Médico' },
  { value: 'NURSE', label: 'Enfermera' },
  { value: 'RECEPTION', label: 'Recepción' },
  { value: 'ACCOUNTING', label: 'Contabilidad' },
  { value: 'PHARMACY', label: 'Farmacia' },
  { value: 'LAB', label: 'Laboratorio' },
] as const;

interface UserItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  dni?: string;
  phone?: string;
  role: string;
  title?: string;
  licenseNumber?: string;
  isActive?: boolean;
  active?: boolean;
}

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  role: string;
  title: string;
  licenseNumber: string;
}

const emptyForm: UserFormData = {
  email: '',
  password: 'User123!',
  firstName: '',
  lastName: '',
  dni: '',
  phone: '',
  role: 'RECEPTION',
  title: '',
  licenseNumber: '',
};

function roleColor(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-indigo-100 text-indigo-700',
    DOCTOR: 'bg-blue-100 text-blue-700',
    NURSE: 'bg-pink-100 text-pink-700',
    RECEPTION: 'bg-amber-100 text-amber-700',
    ACCOUNTING: 'bg-green-100 text-green-700',
    PHARMACY: 'bg-emerald-100 text-emerald-700',
    LAB: 'bg-cyan-100 text-cyan-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-700';
}

function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestione su perfil y los usuarios del sistema
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-0">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          Mi perfil
        </TabButton>
        {isAdmin && (
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
            Usuarios
          </TabButton>
        )}
      </div>

      {tab === 'profile' ? <ProfileTab /> : isAdmin ? <UsersTab /> : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition',
        active
          ? 'border-primary-300 bg-primary-50 text-primary-700'
          : 'border-transparent bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  );
}

function ProfileTab() {
  const { user } = useAuth();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Información de la cuenta</h2>
        <dl className="space-y-3 text-sm">
          <InfoRow label="Nombre completo" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'} />
          <InfoRow label="Correo electrónico" value={user?.email ?? '—'} />
          <InfoRow label="Rol" value={roleLabel(user?.role ?? '')} />
          <InfoRow label="Clínica" value={user?.clinicId ?? '—'} />
        </dl>
      </div>

      <ChangePasswordCard />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'err', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirm) {
      setMessage({ type: 'err', text: 'La confirmación no coincide con la nueva contraseña.' });
      return;
    }
    if (newPassword === currentPassword) {
      setMessage({ type: 'err', text: 'La nueva contraseña debe ser diferente a la actual.' });
      return;
    }

    try {
      setSubmitting(true);
      await api.auth.changePassword(currentPassword, newPassword);
      setMessage({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'No fue posible cambiar la contraseña.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Cambiar contraseña</h2>

      <div className="space-y-3">
        <Field label="Contraseña actual">
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </Field>
        <Field label="Nueva contraseña (mínimo 8)">
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </Field>
        <Field label="Confirmar nueva contraseña">
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </Field>
      </div>

      {message && (
        <p
          className={cn(
            'mt-4 rounded-lg px-3 py-2 text-sm',
            message.type === 'ok'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700',
          )}
        >
          {message.text}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await api.users.list();
      setUsers((res.data ?? []) as UserItem[]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
      u.dni?.toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(u: UserItem) {
    setEditing(u);
    setModalOpen(true);
  }

  async function toggleActive(u: UserItem) {
    const active = isUserActive(u);
    try {
      if (active) {
        await api.users.deactivate(u.id);
      } else {
        await api.users.activate(u.id);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Acción fallida');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Buscar por nombre, correo o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full sm:max-w-xs"
        />
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Nuevo usuario
        </button>
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Nombre completo</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Cargando usuarios...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    {`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3">{u.dni ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleColor(u.role))}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        isUserActive(u)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200 text-slate-600',
                      )}
                    >
                      {isUserActive(u) ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium text-white',
                          isUserActive(u)
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-primary-600 hover:bg-primary-700',
                        )}
                      >
                        {isUserActive(u) ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <UserModal
          initial={editing}
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

function isUserActive(u: UserItem): boolean {
  return u.isActive ?? u.active ?? true;
}

function UserModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: UserItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<UserFormData>(() =>
    initial
      ? {
          email: initial.email ?? '',
          password: '',
          firstName: initial.firstName ?? '',
          lastName: initial.lastName ?? '',
          dni: initial.dni ?? '',
          phone: initial.phone ?? '',
          role: initial.role ?? 'RECEPTION',
          title: initial.title ?? '',
          licenseNumber: initial.licenseNumber ?? '',
        }
      : emptyForm,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof UserFormData>(key: K, value: UserFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!initial && form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      if (initial) {
        const payload: Record<string, unknown> = {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          dni: form.dni || undefined,
          phone: form.phone || undefined,
          role: form.role,
          title: form.title || undefined,
          licenseNumber: form.licenseNumber || undefined,
        };
        await api.users.update(initial.id, payload);
      } else {
        const payload = {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          dni: form.dni || undefined,
          phone: form.phone || undefined,
          role: form.role,
          title: form.title || undefined,
          licenseNumber: form.licenseNumber || undefined,
        };
        await api.users.create(payload);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {initial ? 'Editar usuario' : 'Nuevo usuario'}
          </h3>
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
            <Field label="Correo electrónico">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
            <Field label={initial ? 'Nueva contraseña (opcional)' : 'Contraseña'}>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                placeholder={initial ? 'Dejar en blanco para no cambiar' : 'Mínimo 8 caracteres'}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
            <Field label="Nombres">
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
            <Field label="Apellidos">
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
            <Field label="DNI">
              <input
                type="text"
                value={form.dni}
                onChange={(e) => setField('dni', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
            <Field label="Rol">
              <select
                required
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Título profesional (opcional)">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Dr., Dra., Lic., etc."
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
            <Field label="Número de licencia (opcional)">
              <input
                type="text"
                value={form.licenseNumber}
                onChange={(e) => setField('licenseNumber', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </Field>
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
              {submitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}