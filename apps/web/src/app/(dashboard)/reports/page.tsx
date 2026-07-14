'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

type Tab = 'operativo' | 'financiero' | 'clinico';
type GroupBy = 'day' | 'week' | 'month';

interface DashboardData {
  patientsToday: number;
  appointmentsToday: number;
  waitingQueue: number;
  pendingBilling: number;
  todayRevenue: number;
  activeDoctors: number;
}

interface DoctorProductivity {
  doctorId?: string;
  doctorName?: string;
  name?: string;
  total?: number;
  completed?: number;
}

interface ByDateItem {
  period?: string;
  date?: string;
  total?: number;
  count?: number;
}

interface FinancialData {
  totalRevenue?: number;
  paymentCount?: number;
  pendingAmount?: number;
  byMethod?: Array<{ method: string; total: number; count: number }>;
}

interface DiagnosisItem {
  code?: string;
  description?: string;
  count?: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  INSURANCE: 'Seguro',
  MIXED: 'Mixto',
};

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function todayInput() {
  return toDateInput(new Date());
}

function monthStartInput() {
  return toDateInput(monthStart());
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('operativo');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Indicadores operativos, financieros y clínicos
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-0">
        <TabButton active={tab === 'operativo'} onClick={() => setTab('operativo')}>
          Operativo
        </TabButton>
        <TabButton active={tab === 'financiero'} onClick={() => setTab('financiero')}>
          Financiero
        </TabButton>
        <TabButton active={tab === 'clinico'} onClick={() => setTab('clinico')}>
          Clínico
        </TabButton>
      </div>

      {tab === 'operativo' && <OperativoTab />}
      {tab === 'financiero' && <FinancieroTab />}
      {tab === 'clinico' && <ClinicoTab />}
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

function OperativoTab() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(true);

  const [productivity, setProductivity] = useState<DoctorProductivity[]>([]);
  const [loadingProd, setLoadingProd] = useState(true);

  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return toDateInput(d);
  });
  const [end, setEnd] = useState(todayInput());
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [byDate, setByDate] = useState<ByDateItem[]>([]);
  const [loadingByDate, setLoadingByDate] = useState(false);
  const [byDateError, setByDateError] = useState<string | null>(null);

  useEffect(() => {
    api.reports
      .dashboard()
      .then((res) => setDashboard((res.data ?? null) as DashboardData | null))
      .catch(console.error)
      .finally(() => setLoadingDash(false));

    api.reports
      .doctorProductivity()
      .then((res) => setProductivity((res.data ?? []) as DoctorProductivity[]))
      .catch(console.error)
      .finally(() => setLoadingProd(false));
  }, []);

  async function loadByDate(e?: FormEvent) {
    e?.preventDefault();
    if (!start || !end) return;
    if (start > end) {
      setByDateError('La fecha de inicio no puede ser mayor a la fecha final.');
      return;
    }
    try {
      setLoadingByDate(true);
      setByDateError(null);
      const res = await api.reports.byDate(start, end, groupBy);
      setByDate((res.data ?? []) as ByDateItem[]);
    } catch (err) {
      setByDateError(err instanceof Error ? err.message : 'Error al cargar datos');
      setByDate([]);
    } finally {
      setLoadingByDate(false);
    }
  }

  useEffect(() => {
    loadByDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  const cards = [
    { label: 'Pacientes hoy', value: dashboard?.patientsToday, accent: 'bg-blue-50 text-blue-700' },
    { label: 'Citas hoy', value: dashboard?.appointmentsToday, accent: 'bg-green-50 text-green-700' },
    { label: 'En cola', value: dashboard?.waitingQueue, accent: 'bg-amber-50 text-amber-700' },
    {
      label: 'Ingresos hoy',
      value: dashboard ? formatCurrency(dashboard.todayRevenue) : undefined,
      accent: 'bg-indigo-50 text-indigo-700',
      raw: true,
    },
  ];

  const byDateMax = useMemo(() => {
    return byDate.reduce((acc, item) => {
      const v = Number(item.total ?? item.count ?? 0);
      return v > acc ? v : acc;
    }, 0);
  }, [byDate]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={cn('rounded-xl p-6', c.accent)}>
            <p className="text-sm font-medium opacity-80">{c.label}</p>
            <p className="mt-2 text-3xl font-bold">
              {loadingDash ? '—' : c.value ?? '—'}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Productividad por médico
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Médico</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Completadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loadingProd ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : productivity.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Sin datos de productividad.
                  </td>
                </tr>
              ) : (
                productivity.map((p, idx) => (
                  <tr key={p.doctorId ?? p.doctorName ?? idx}>
                    <td className="px-4 py-3">{p.doctorName ?? p.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{p.total ?? 0}</td>
                    <td className="px-4 py-3 text-right">{p.completed ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Citas por rango</h2>
          <form onSubmit={loadByDate} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Desde</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Hasta</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Agrupar</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Consultar
            </button>
          </form>
        </div>

        {byDateError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{byDateError}</p>
        )}

        {loadingByDate ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando datos...</p>
        ) : byDate.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Sin datos en el rango seleccionado.
          </p>
        ) : (
          <div className="space-y-2">
            {byDate.map((item, idx) => {
              const value = Number(item.total ?? item.count ?? 0);
              const pct = byDateMax > 0 ? (value / byDateMax) * 100 : 0;
              const label = item.period ?? item.date ?? `Punto ${idx + 1}`;
              return (
                <div key={`${label}-${idx}`} className="flex items-center gap-3 text-xs">
                  <div className="w-24 shrink-0 truncate text-slate-600" title={label}>
                    {label}
                  </div>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full bg-primary-500"
                      style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <div className="w-12 text-right font-medium text-slate-700">{value}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FinancieroTab() {
  const [start, setStart] = useState(monthStartInput());
  const [end, setEnd] = useState(todayInput());
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    if (!start || !end) return;
    if (start > end) {
      setError('La fecha de inicio no puede ser mayor a la fecha final.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.reports.financial(start, end);
      setData((res.data ?? null) as FinancialData | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = [
    {
      label: 'Ingresos totales',
      value: formatCurrency(data?.totalRevenue),
      accent: 'bg-green-50 text-green-700',
    },
    {
      label: 'Pagos realizados',
      value: String(data?.paymentCount ?? 0),
      accent: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Pendiente de cobro',
      value: formatCurrency(data?.pendingAmount),
      accent: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <form
        onSubmit={load}
        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs font-medium text-slate-600">
          <span className="mb-1 block">Desde</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </label>
        <label className="flex-1 text-xs font-medium text-slate-600">
          <span className="mb-1 block">Hasta</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Consultar
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {totals.map((c) => (
          <div key={c.label} className={cn('rounded-xl p-6', c.accent)}>
            <p className="text-sm font-medium opacity-80">{c.label}</p>
            <p className="mt-2 text-2xl font-bold">{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Por método de pago</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : !data?.byMethod?.length ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Sin datos para el rango seleccionado.
                  </td>
                </tr>
              ) : (
                data.byMethod.map((row) => (
                  <tr key={row.method}>
                    <td className="px-4 py-3">{PAYMENT_LABELS[row.method] ?? row.method}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.total)}</td>
                    <td className="px-4 py-3 text-right">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClinicoTab() {
  const [start, setStart] = useState(monthStartInput());
  const [end, setEnd] = useState(todayInput());
  const [items, setItems] = useState<DiagnosisItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    if (!start || !end) return;
    if (start > end) {
      setError('La fecha de inicio no puede ser mayor a la fecha final.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.reports.clinical(start, end);
      setItems((res.data ?? []) as DiagnosisItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCsv() {
    const headers = ['Código', 'Descripción', 'Cantidad'];
    const rows = items.map((it) => [
      it.code ?? '',
      (it.description ?? '').replace(/"/g, '""'),
      String(it.count ?? 0),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const needsQuotes = /[",\n;]/.test(cell);
            return needsQuotes ? `"${cell}"` : cell;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnosticos_${start}_a_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={load}
        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs font-medium text-slate-600">
          <span className="mb-1 block">Desde</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </label>
        <label className="flex-1 text-xs font-medium text-slate-600">
          <span className="mb-1 block">Hasta</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Consultar
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!items.length}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Exportar CSV
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Diagnósticos más frecuentes
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Sin diagnósticos registrados en el rango.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={`${it.code ?? ''}-${idx}`}>
                    <td className="px-4 py-3 font-mono text-xs">{it.code ?? '—'}</td>
                    <td className="px-4 py-3">{it.description ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{it.count ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}