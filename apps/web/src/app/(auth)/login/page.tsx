'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const TEST_CREDENTIALS = [
  { label: 'Administrador', email: 'admin@unior.local', password: 'Admin123!' },
  { label: 'Doctor', email: 'doctor@unior.local', password: 'Doctor123!' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('admin@unior.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo iniciar sesión';
      setError(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white p-8 shadow-lg ring-1 ring-slate-200/60">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md">
              <Activity className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Poli-ERP UNIOR</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sistema de Gestión Policonsultorio
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@unior.local"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Info className="h-3.5 w-3.5" />
              Credenciales de prueba
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              {TEST_CREDENTIALS.map((c) => (
                <li key={c.email} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="font-medium text-slate-700">{c.label}:</span>
                  <code className="font-mono text-[11px] text-slate-700">{c.email}</code>
                  <span className="text-slate-400">/</span>
                  <code className="font-mono text-[11px] text-slate-700">{c.password}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Policonsultorio UNIOR
        </p>
      </div>
    </div>
  );
}