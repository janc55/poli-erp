export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const fmt = new Intl.DateTimeFormat('es-DO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  });
  return fmt.format(date);
}

export function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'bg-slate-100 text-slate-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    CHECKED_IN: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-gray-200 text-gray-600',
    WAITING: 'bg-amber-100 text-amber-700',
    IN_CONSULTATION: 'bg-purple-100 text-purple-700',
    DONE: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-blue-100 text-blue-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En sala de espera',
  IN_PROGRESS: 'En consulta',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  WAITING: 'Esperando',
  IN_CONSULTATION: 'En consulta',
  DONE: 'Finalizado',
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PARTIAL: 'Parcial',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
