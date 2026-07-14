'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User, Stethoscope } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  const initials = (firstName.charAt(0) || 'U').toUpperCase();
  const fullName = `${firstName} ${lastName}`.trim() || 'Usuario';

  return (
    <div className="sticky top-0 z-30">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Búsqueda global..."
            className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-80"
          />
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-slate-900">{fullName}</span>
              <span className="block text-xs text-slate-500">{user?.role ?? '—'}</span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email ?? '—'}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                  <Stethoscope className="h-3 w-3" />
                  {user?.role ?? '—'}
                </span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User className="h-4 w-4" />
                  Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="border-b border-slate-200 bg-slate-50 px-6 py-1.5">
        <p className="text-xs font-medium text-slate-600">
          Policonsultorio UNIOR — Sistema de Gestión
        </p>
      </div>
    </div>
  );
}