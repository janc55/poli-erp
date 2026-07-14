'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Wallet,
  Package,
  BarChart3,
  Settings,
  MonitorPlay,
  UserCog,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: 'Operación',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/queue', label: 'Cola OPD', icon: MonitorPlay },
      { href: '/patients', label: 'Pacientes', icon: Users },
      { href: '/appointments', label: 'Citas', icon: Calendar },
    ],
  },
  {
    title: 'Clínico',
    items: [
      { href: '/medical-records', label: 'Historias Clínicas', icon: FileText },
      { href: '/billing', label: 'Pagos / Caja', icon: Wallet },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/inventory', label: 'Inventario', icon: Package },
      { href: '/users', label: 'Usuarios', icon: UserCog },
      { href: '/settings', label: 'Configuración', icon: Settings },
    ],
  },
  {
    title: 'Analítica',
    items: [{ href: '/reports', label: 'Reportes', icon: BarChart3 }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario';
  const initials = (user?.firstName?.charAt(0) ?? 'U').toUpperCase();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-lg font-bold text-primary-700">UNIOR</h2>
        <p className="text-xs text-slate-500">Policonsultorio</p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{fullName}</p>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500">
              <Stethoscope className="h-3 w-3" />
              {user?.role ?? '—'}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <span className="font-mono">UNIOR</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}