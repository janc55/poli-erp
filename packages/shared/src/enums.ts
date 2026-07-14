export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTION = 'RECEPTION',
  ACCOUNTING = 'ACCOUNTING',
  PHARMACY = 'PHARMACY',
  LAB = 'LAB',
  PATIENT = 'PATIENT',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum QueueStatus {
  WAITING = 'WAITING',
  IN_CONSULTATION = 'IN_CONSULTATION',
  DONE = 'DONE',
  NO_SHOW = 'NO_SHOW',
}

export enum BillingStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  INSURANCE = 'INSURANCE',
  MIXED = 'MIXED',
}

export const MVP_MODULES = [
  'auth',
  'patients',
  'appointments',
  'queue',
  'medical-records',
  'billing',
  'reports',
] as const;

export type MvpModule = (typeof MVP_MODULES)[number];

export const PHASE2_MODULES = [
  'inventory',
  'pharmacy',
  'laboratory',
  'insurance',
  'accounting',
] as const;
