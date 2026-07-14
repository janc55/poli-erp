'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

interface DashboardStats {
  patientsToday: number;
  appointmentsToday: number;
  waitingQueue: number;
  pendingBilling: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.reports.dashboard().then((res) => setStats(res.data)).catch(console.error);
  }, []);

  const cards = [
    { label: 'Atendidos hoy', value: stats?.patientsToday ?? '—', color: 'bg-blue-50 text-blue-700' },
    { label: 'Citas hoy', value: stats?.appointmentsToday ?? '—', color: 'bg-green-50 text-green-700' },
    { label: 'En cola OPD', value: stats?.waitingQueue ?? '—', color: 'bg-amber-50 text-amber-700' },
    { label: 'Facturas pendientes', value: stats?.pendingBilling ?? '—', color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl p-6 ${card.color}`}>
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
