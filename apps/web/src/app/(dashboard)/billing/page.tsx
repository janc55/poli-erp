'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Plus,
  Search,
  X,
  Ban,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { formatCurrency, formatDate, statusColor, statusLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 w-full';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}
interface InvoiceItem {
  id?: string;
  description?: string;
  serviceName?: string;
  quantity?: number;
  unitPrice?: number | string;
  total?: number | string;
  subtotal?: number | string;
}
interface InvoicePayment {
  id?: string;
  amount: number | string;
  method: string;
  reference?: string;
  notes?: string;
  createdAt?: string;
}
interface Invoice {
  id: string;
  invoiceNumber?: string;
  number?: string;
  patient?: Patient;
  patientName?: string;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  total?: number | string;
  paid?: number | string;
  paidAmount?: number | string;
  balance?: number | string;
  subtotal?: number | string;
  tax?: number | string;
  discount?: number | string;
  status?: string;
  createdAt?: string;
  issuedAt?: string;
  notes?: string;
}
interface CashRegister {
  id: string;
  name?: string;
  code?: string;
  location?: string;
}
interface CashSession {
  id: string;
  cashRegister?: CashRegister;
  cashRegisterId?: string;
  registerName?: string;
  opener?: { firstName: string; lastName: string };
  openedBy?: { firstName: string; lastName: string };
  openedAt?: string;
  closedAt?: string;
  status?: string;
  openingAmount?: number | string;
  closingAmount?: number | string;
  notes?: string;
}

function patientName(p?: Patient | null) {
  if (!p) return '—';
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—';
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return v;
}

function paymentTotal(payments?: InvoicePayment[] | null): number {
  if (!payments) return 0;
  return payments.reduce((acc, p) => acc + num(p.amount), 0);
}

function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className={cn('mt-10 w-full rounded-xl bg-white shadow-xl', sizes[size])}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  INSURANCE: 'Seguro',
  MIXED: 'Mixto',
};

const METHOD_OPTIONS = ['CASH', 'CARD', 'TRANSFER', 'INSURANCE', 'MIXED'] as const;

export default function BillingPage() {
  const [tab, setTab] = useState<'invoices' | 'cash'>('invoices');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facturación</h1>
        <p className="text-sm text-slate-500">Facturas, pagos y caja</p>
      </div>

      <div className="flex border-b border-slate-200">
        {(
          [
            { k: 'invoices', l: 'Facturas' },
            { k: 'cash', l: 'Pagos / Caja' },
          ] as const
        ).map((t) => (
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
      </div>

      {tab === 'invoices' ? <InvoicesTab /> : <CashTab />}
    </div>
  );
}

function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [viewInv, setViewInv] = useState<Invoice | null>(null);
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [cancelInv, setCancelInv] = useState<Invoice | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.billing.list({
        page,
        limit: 10,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      });
      const data = res.data ?? [];
      setInvoices(data as Invoice[]);
      const arr = Array.isArray(data) ? data : [];
      setTotal(arr.length);
      setTotalPages(1);
    } catch (e) {
      console.error(e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function refreshOne(id: string) {
    try {
      const res = await api.billing.get(id);
      const fresh = res.data as Invoice;
      setInvoices((prev) => prev.map((i) => (i.id === id ? fresh : i)));
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={onSearch} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por # factura o paciente..."
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={cn(inputClass, 'sm:w-44')}
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIAL">Parcial</option>
            <option value="PAID">Pagado</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Filtrar
          </button>
        </form>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nueva factura
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3"># Factura</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Sin facturas.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const total = num(inv.total);
                  const paid = inv.paid !== undefined ? num(inv.paid) : paymentTotal(inv.payments);
                  const balance = inv.balance !== undefined ? num(inv.balance) : Math.max(0, total - paid);
                  return (
                    <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">
                        {inv.invoiceNumber ?? inv.number ?? inv.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patientName(inv.patient) !== '—' ? patientName(inv.patient) : inv.patientName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(paid)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(balance)}</td>
                      <td className="px-4 py-3">
                        {inv.status && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              statusColor(inv.status),
                            )}
                          >
                            {statusLabel(inv.status)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(inv.createdAt ?? inv.issuedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewInv(inv)}
                            className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setPayInv(inv)}
                              className="rounded p-1.5 text-green-600 hover:bg-green-50"
                              title="Registrar pago"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                          {inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setCancelInv(inv)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              title="Cancelar"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>
            {total > 0 ? `Mostrando ${invoices.length} de ${total}` : 'Sin resultados'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span>
              Página {page} / {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <ViewInvoiceModal invoice={viewInv} onClose={() => setViewInv(null)} />
      <PayInvoiceModal
        invoice={payInv}
        onClose={() => setPayInv(null)}
        onPaid={(id) => {
          setPayInv(null);
          refreshOne(id);
        }}
      />
      <CancelInvoiceModal
        invoice={cancelInv}
        onClose={() => setCancelInv(null)}
        onCancelled={(id) => {
          setCancelInv(null);
          refreshOne(id);
        }}
      />
      <NewInvoiceModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          setNewOpen(false);
          load();
        }}
      />
    </div>
  );
}

function ViewInvoiceModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  if (!invoice) return null;
  const total = num(invoice.total);
  const paid = invoice.paid !== undefined ? num(invoice.paid) : paymentTotal(invoice.payments);
  const balance = invoice.balance !== undefined ? num(invoice.balance) : Math.max(0, total - paid);
  return (
    <Modal open onClose={onClose} title={`Factura ${invoice.invoiceNumber ?? invoice.number ?? ''}`} size="lg">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Paciente" value={patientName(invoice.patient) !== '—' ? patientName(invoice.patient) : invoice.patientName} />
          <Field label="Fecha" value={formatDate(invoice.createdAt ?? invoice.issuedAt, true)} />
          <Field
            label="Estado"
            value={
              invoice.status ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    statusColor(invoice.status),
                  )}
                >
                  {statusLabel(invoice.status)}
                </span>
              ) : (
                '—'
              )
            }
          />
        </div>

        <div className="rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2 text-right">Cant.</th>
                <th className="px-3 py-2 text-right">P. unit.</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items ?? []).map((it, i) => (
                <tr key={it.id ?? i} className="border-t border-slate-100">
                  <td className="px-3 py-2">{it.description ?? it.serviceName ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{it.quantity ?? 1}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(it.unitPrice ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(it.total ?? it.subtotal ?? num(it.unitPrice) * (it.quantity ?? 1))}
                  </td>
                </tr>
              ))}
              {(invoice.items ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    Sin ítems
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Pagos</p>
            {(invoice.payments ?? []).length === 0 ? (
              <p className="text-slate-500">Sin pagos registrados.</p>
            ) : (
              <ul className="space-y-1">
                {invoice.payments!.map((p, i) => (
                  <li key={p.id ?? i} className="flex justify-between">
                    <span>
                      {METHOD_LABEL[p.method] ?? p.method}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <Row label="Subtotal" value={formatCurrency(num(invoice.subtotal))} />
            <Row label="Impuestos" value={formatCurrency(num(invoice.tax))} />
            <Row label="Descuento" value={formatCurrency(num(invoice.discount))} />
            <Row label="Total" value={formatCurrency(total)} bold />
            <Row label="Pagado" value={formatCurrency(paid)} />
            <Row label="Saldo" value={formatCurrency(balance)} bold />
          </div>
        </div>

        {invoice.notes && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Notas</p>
            <p className="mt-1 text-slate-700">{invoice.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className={cn('text-slate-600', bold && 'font-semibold text-slate-900')}>{label}</span>
      <span className={cn('text-slate-700', bold && 'font-bold text-slate-900')}>{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function PayInvoiceModal({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onPaid: (id: string) => void;
}) {
  const total = invoice ? num(invoice.total) : 0;
  const paid = invoice
    ? invoice.paid !== undefined
      ? num(invoice.paid)
      : paymentTotal(invoice.payments)
    : 0;
  const balance = invoice ? Math.max(0, total - paid) : 0;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof METHOD_OPTIONS)[number]>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      setAmount(String(balance));
      setMethod('CASH');
      setReference('');
      setNotes('');
      setError('');
    }
  }, [invoice, balance]);

  if (!invoice) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.billing.pay(invoice!.id, {
        amount: parseFloat(amount),
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      onPaid(invoice!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar pago" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-500">Saldo pendiente</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(balance)}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Monto</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={balance}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as (typeof METHOD_OPTIONS)[number])}
            className={inputClass}
          >
            {METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Referencia (opcional)</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CancelInvoiceModal({
  invoice,
  onClose,
  onCancelled,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onCancelled: (id: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      setReason('');
      setError('');
    }
  }, [invoice]);

  if (!invoice) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Indica el motivo de cancelación');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.billing.cancel(invoice!.id, reason);
      onCancelled(invoice!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Cancelar factura" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-700">
          Vas a cancelar la factura{' '}
          <span className="font-mono font-semibold">
            {invoice.invoiceNumber ?? invoice.number ?? invoice.id.slice(0, 8)}
          </span>
          . Esta acción no se puede deshacer.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            className={inputClass}
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Cancelando...' : 'Confirmar cancelación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewInvoiceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patientQuery, setPatientQuery] = useState('');
  const [patientOptions, setPatientOptions] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState([
    { description: '', quantity: 1, unitPrice: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (patientQuery.length < 2) {
        setPatientOptions([]);
        return;
      }
      try {
        const res = await api.patients.search(patientQuery);
        setPatientOptions((res.data ?? []) as Patient[]);
      } catch {
        setPatientOptions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, open]);

  useEffect(() => {
    if (!open) {
      setPatient(null);
      setPatientQuery('');
      setItems([{ description: '', quantity: 1, unitPrice: '' }]);
      setNotes('');
      setError('');
    }
  }, [open]);

  const total = useMemo(
    () =>
      items.reduce((acc, it) => acc + (parseFloat(it.unitPrice) || 0) * (it.quantity || 1), 0),
    [items],
  );

  function updateItem(i: number, patch: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: '' }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) {
      setError('Selecciona un paciente');
      return;
    }
    const validItems = items.filter((it) => it.description.trim() && parseFloat(it.unitPrice) > 0);
    if (validItems.length === 0) {
      setError('Agrega al menos un ítem válido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.billing.create({
        patientId: patient.id,
        items: validItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: parseFloat(it.unitPrice),
        })),
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear factura');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Nueva factura" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Paciente <span className="text-red-500">*</span>
          </label>
          {patient ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
              <span className="font-medium">{patientName(patient)}</span>
              <button
                type="button"
                onClick={() => setPatient(null)}
                className="text-xs text-red-600 hover:underline"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Buscar paciente..."
                className={inputClass}
              />
              {patientOptions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {patientOptions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPatient(p);
                          setPatientOptions([]);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {patientName(p)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Ítems / servicios</label>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              + Agregar ítem
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid items-end gap-2 md:grid-cols-12">
                <div className="md:col-span-6">
                  <input
                    placeholder="Descripción / servicio"
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value, 10) || 1 })}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio unit."
                    value={it.unitPrice}
                    onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="font-medium text-slate-700">Total estimado</span>
          <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear factura'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CashTab() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [active, setActive] = useState<CashSession[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportSession, setReportSession] = useState<CashSession | null>(null);
  const [reportData, setReportData] = useState<unknown>(null);
  const [closeSession, setCloseSession] = useState<CashSession | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [list, act, regs] = await Promise.all([
        api.cash.list(),
        api.cash.active(),
        api.cash.registers(),
      ]);
      setSessions((list.data ?? []) as CashSession[]);
      setActive((act.data ?? []) as CashSession[]);
      setRegisters((regs.data ?? []) as CashRegister[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function viewReport(s: CashSession) {
    setReportSession(s);
    try {
      const res = await api.cash.report(s.id);
      setReportData(res.data);
    } catch (e) {
      console.error(e);
      setReportData(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Sesiones de caja</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Caja</th>
                  <th className="px-4 py-3">Apertura por</th>
                  <th className="px-4 py-3">Abierta</th>
                  <th className="px-4 py-3">Cerrada</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Cargando...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Sin sesiones registradas.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => {
                    const opener = s.opener ?? s.openedBy;
                    const status = (s.status ?? 'CLOSED').toUpperCase();
                    return (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {s.cashRegister?.name ?? s.registerName ?? s.cashRegisterId ?? '—'}
                          </div>
                          {s.cashRegister?.location && (
                            <div className="text-xs text-slate-500">{s.cashRegister.location}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {opener ? `${opener.firstName} ${opener.lastName}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(s.openedAt, true)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(s.closedAt, true)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              status === 'OPEN'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => viewReport(s)}
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                              title="Ver reporte"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {status === 'OPEN' && (
                              <button
                                onClick={() => setCloseSession(s)}
                                className="rounded p-1.5 text-red-600 hover:bg-red-50"
                                title="Cerrar caja"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <OpenCashForm registers={registers} onOpened={load} />
        <ActiveCashList sessions={active} />
      </div>

      <ReportModal
        session={reportSession}
        data={reportData}
        onClose={() => {
          setReportSession(null);
          setReportData(null);
        }}
      />
      <CloseCashModal
        session={closeSession}
        onClose={() => setCloseSession(null)}
        onClosed={() => {
          setCloseSession(null);
          load();
        }}
      />
    </div>
  );
}

function OpenCashForm({
  registers,
  onOpened,
}: {
  registers: CashRegister[];
  onOpened: () => void;
}) {
  const [registerId, setRegisterId] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!registerId && registers.length > 0) {
      setRegisterId(registers[0].id);
    }
  }, [registers, registerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!registerId) {
      setError('Selecciona una caja');
      return;
    }
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Monto de apertura inválido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.cash.open({
        cashRegisterId: registerId,
        openingAmount: amount,
        notes: notes || undefined,
      });
      setRegisterId('');
      setOpeningAmount('');
      setNotes('');
      onOpened();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir caja');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Abrir caja</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Caja registradora</label>
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona...</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name ?? r.code ?? r.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Monto apertura</label>
          <input
            type="number"
            step="0.01"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Banknote className="h-4 w-4" />
          {saving ? 'Abriendo...' : 'Abrir caja'}
        </button>
      </form>
    </div>
  );
}

function ActiveCashList({ sessions }: { sessions: CashSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Cajas activas</h2>
        <p className="text-sm text-slate-500">No hay cajas abiertas.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Cajas activas</h2>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm"
          >
            <div>
              <p className="font-medium text-slate-900">
                {s.cashRegister?.name ?? s.registerName ?? s.cashRegisterId}
              </p>
              <p className="text-xs text-slate-500">Abierta: {formatDate(s.openedAt, true)}</p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Abierta
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportModal({
  session,
  data,
  onClose,
}: {
  session: CashSession | null;
  data: unknown;
  onClose: () => void;
}) {
  if (!session) return null;
  return (
    <Modal open onClose={onClose} title="Reporte de caja" size="md">
      <div className="space-y-3 text-sm">
        <Field label="Caja" value={session.cashRegister?.name ?? session.registerName} />
        <Field label="Abierta" value={formatDate(session.openedAt, true)} />
        <Field label="Cerrada" value={formatDate(session.closedAt, true)} />
        <Field label="Monto apertura" value={formatCurrency(num(session.openingAmount))} />
        <Field label="Monto cierre" value={formatCurrency(num(session.closingAmount))} />
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Detalle</p>
          <pre className="overflow-auto text-xs text-slate-700">
            {data ? JSON.stringify(data, null, 2) : 'Sin datos'}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

function CloseCashModal({
  session,
  onClose,
  onClosed,
}: {
  session: CashSession | null;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      setClosingAmount('');
      setNotes('');
      setError('');
    }
  }, [session]);

  if (!session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Monto de cierre inválido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.cash.close(session!.id, {
        closingAmount: amount,
        notes: notes || undefined,
      });
      onClosed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar caja');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Cerrar caja" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-700">
          Cerrando la caja{' '}
          <span className="font-medium">{session.cashRegister?.name ?? session.registerName}</span>.
          Asegúrate de contar el efectivo antes de continuar.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Monto de cierre</label>
          <input
            type="number"
            step="0.01"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'Cerrando...' : 'Confirmar cierre'}
          </button>
        </div>
      </form>
    </Modal>
  );
}