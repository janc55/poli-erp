import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  PaginatedResponse,
} from '@poli-erp/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE = `${API_URL}/api`;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

function setAccessCookie(token: string | null) {
  if (typeof document === 'undefined') return;
  if (token === null) {
    document.cookie = `poli_auth=; Path=/; Max-Age=0; SameSite=Lax`;
  } else {
    document.cookie = `poli_auth=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax`;
  }
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  setAccessCookie(null);
}

async function rawRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry && getRefreshToken()) {
    // Intentar refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return rawRequest<T>(path, options, false);
    }
    clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = typeof body.message === 'string' ? body.message : body.message.join(', ');
      }
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string };
    localStorage.setItem('accessToken', data.accessToken);
    setAccessCookie(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// ───── API ──────────────────────────────────────────────────────────
export const api = {
  // Auth
  auth: {
    login: (data: LoginRequest) =>
      rawRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }, false),
    me: () => rawRequest<ApiResponse<unknown>>('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      rawRequest<ApiResponse<{ message: string }>>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  // Patients
  patients: {
    list: (params?: Record<string, string | number>) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/patients${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`,
      ),
    search: (q: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/patients/search?q=${encodeURIComponent(q)}`),
    get: (id: string) => rawRequest<ApiResponse<unknown>>(`/patients/${id}`),
    create: (data: unknown) =>
      rawRequest<ApiResponse<unknown>>('/patients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      rawRequest<ApiResponse<unknown>>(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deactivate: (id: string) =>
      rawRequest<ApiResponse<{ message: string }>>(`/patients/${id}/deactivate`, {
        method: 'PATCH',
      }),
    timeline: (id: string) =>
      rawRequest<ApiResponse<unknown>>(`/patients/${id}/timeline`),
  },

  // Appointments
  appointments: {
    list: (params?: Record<string, string | number>) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/appointments${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`,
      ),
    today: () => rawRequest<ApiResponse<unknown>>('/appointments/today'),
    get: (id: string) => rawRequest<ApiResponse<unknown>>(`/appointments/${id}`),
    availability: (doctorId: string, date: string) =>
      rawRequest<ApiResponse<unknown>>(
        `/appointments/availability?doctorId=${doctorId}&date=${date}`,
      ),
    waitingList: () => rawRequest<ApiResponse<unknown>>('/appointments/waiting-list'),
    create: (data: unknown) =>
      rawRequest<ApiResponse<unknown>>('/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      rawRequest<ApiResponse<unknown>>(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    cancel: (id: string, reason: string) =>
      rawRequest<ApiResponse<unknown>>(`/appointments/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    reschedule: (id: string, newDateTime: string, reason?: string) =>
      rawRequest<ApiResponse<unknown>>(`/appointments/${id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ newDateTime, reason }),
      }),
    checkIn: (id: string) =>
      rawRequest<ApiResponse<unknown>>(`/appointments/${id}/check-in`, { method: 'POST' }),
    confirm: (id: string) =>
      rawRequest<ApiResponse<unknown>>(`/appointments/${id}/confirm`, { method: 'POST' }),
  },

  // Queue
  queue: {
    list: (specialtyId?: string) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/queue${specialtyId ? `?specialtyId=${specialtyId}` : ''}`,
      ),
    occupancy: () => rawRequest<ApiResponse<unknown[]>>('/queue/occupancy'),
    call: (id: string) => rawRequest(`/queue/${id}/call`, { method: 'POST' }),
    complete: (id: string, notes?: string) =>
      rawRequest(`/queue/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ status: 'DONE', notes }),
      }),
    noShow: (id: string, notes?: string) =>
      rawRequest(`/queue/${id}/no-show`, {
        method: 'POST',
        body: JSON.stringify({ status: 'NO_SHOW', notes }),
      }),
  },

  // Medical Records
  medicalRecords: {
    list: (params?: Record<string, string | number>) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/medical-records${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`,
      ),
    get: (id: string) => rawRequest<ApiResponse<unknown>>(`/medical-records/${id}`),
    byPatient: (patientId: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/medical-records/patient/${patientId}`),
    versions: (id: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/medical-records/${id}/versions`),
    create: (data: unknown) =>
      rawRequest<ApiResponse<unknown>>('/medical-records', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      rawRequest<ApiResponse<unknown>>(`/medical-records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Billing
  billing: {
    list: (params?: Record<string, string | number>) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/billing${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`,
      ),
    get: (id: string) => rawRequest<ApiResponse<unknown>>(`/billing/${id}`),
    byInvoiceNumber: (number: string) =>
      rawRequest<ApiResponse<unknown>>(`/billing/invoice/${number}`),
    create: (data: unknown) =>
      rawRequest<ApiResponse<unknown>>('/billing', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      rawRequest<ApiResponse<unknown>>(`/billing/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    pay: (id: string, data: unknown) =>
      rawRequest<ApiResponse<unknown>>(`/billing/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: string, reason: string) =>
      rawRequest<ApiResponse<unknown>>(`/billing/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  // Cash sessions
  cash: {
    list: () => rawRequest<ApiResponse<unknown[]>>('/cash-sessions'),
    active: () => rawRequest<ApiResponse<unknown[]>>('/cash-sessions/active'),
    registers: () => rawRequest<ApiResponse<unknown[]>>('/cash-sessions/cash-registers'),
    open: (data: { cashRegisterId: string; openingAmount: number; notes?: string }) =>
      rawRequest<ApiResponse<unknown>>('/cash-sessions/open', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    close: (id: string, data: { closingAmount: number; notes?: string }) =>
      rawRequest<ApiResponse<unknown>>(`/cash-sessions/${id}/close`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    report: (id: string) =>
      rawRequest<ApiResponse<unknown>>(`/cash-sessions/${id}/report`),
  },

  // Users
  users: {
    list: (params?: Record<string, string | number>) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/users${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`,
      ),
    doctors: () => rawRequest<ApiResponse<unknown[]>>('/users/doctors'),
    get: (id: string) => rawRequest<ApiResponse<unknown>>(`/users/${id}`),
    create: (data: unknown) =>
      rawRequest<ApiResponse<unknown>>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      rawRequest<ApiResponse<unknown>>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deactivate: (id: string) =>
      rawRequest(`/users/${id}/deactivate`, { method: 'PATCH' }),
    activate: (id: string) =>
      rawRequest(`/users/${id}/activate`, { method: 'PATCH' }),
  },

  // Specialties
  specialties: {
    list: () => rawRequest<ApiResponse<unknown[]>>('/specialties'),
    create: (data: unknown) =>
      rawRequest('/specialties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      rawRequest(`/specialties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivate: (id: string) =>
      rawRequest(`/specialties/${id}/deactivate`, { method: 'PATCH' }),
  },

  // Rooms
  rooms: {
    list: () => rawRequest<ApiResponse<unknown[]>>('/rooms'),
    create: (data: unknown) =>
      rawRequest('/rooms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      rawRequest(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivate: (id: string) =>
      rawRequest(`/rooms/${id}/deactivate`, { method: 'PATCH' }),
  },

  // CIE-10
  cie10: {
    list: (params?: { search?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString();
      return rawRequest<ApiResponse<unknown[]>>(`/cie10${q ? `?${q}` : ''}`);
    },
    search: (q: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/cie10/search?q=${encodeURIComponent(q)}`),
  },

  // Inventory
  inventory: {
    products: (params?: Record<string, string | number>) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/inventory/products${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`,
      ),
    product: (id: string) =>
      rawRequest<ApiResponse<unknown>>(`/inventory/products/${id}`),
    lowStock: () => rawRequest<ApiResponse<unknown[]>>('/inventory/products/low-stock'),
    expiring: (days = 30) =>
      rawRequest<ApiResponse<unknown[]>>(`/inventory/products/expiring?days=${days}`),
    movements: (productId: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/inventory/movements/product/${productId}`),
    createProduct: (data: unknown) =>
      rawRequest('/inventory/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createMovement: (data: unknown) =>
      rawRequest('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createBatch: (data: unknown) =>
      rawRequest('/inventory/batches', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    suppliers: () => rawRequest<ApiResponse<unknown[]>>('/inventory/suppliers'),
  },

  // Insurance
  insurance: {
    providers: () => rawRequest<ApiResponse<unknown[]>>('/insurance/providers'),
    agreements: (providerId: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/insurance/providers/${providerId}/agreements`),
    patientInsurances: (patientId: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/insurance/patients/${patientId}`),
    createProvider: (data: unknown) =>
      rawRequest('/insurance/providers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addToPatient: (patientId: string, data: unknown) =>
      rawRequest(`/insurance/patients/${patientId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Prescriptions
  prescriptions: {
    list: () => rawRequest<ApiResponse<unknown[]>>('/prescriptions'),
    byPatient: (patientId: string) =>
      rawRequest<ApiResponse<unknown[]>>(`/prescriptions/patient/${patientId}`),
    get: (id: string) => rawRequest<ApiResponse<unknown>>(`/prescriptions/${id}`),
    create: (data: unknown) =>
      rawRequest('/prescriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    dispense: (id: string) =>
      rawRequest(`/prescriptions/${id}/dispense`, { method: 'POST' }),
  },

  // Lab orders
  lab: {
    list: () => rawRequest<ApiResponse<unknown[]>>('/lab-orders'),
    pending: () => rawRequest<ApiResponse<unknown[]>>('/lab-orders/pending'),
    get: (id: string) => rawRequest<ApiResponse<unknown>>(`/lab-orders/${id}`),
    examTypes: () => rawRequest<ApiResponse<unknown[]>>('/lab-orders/exam-types'),
    create: (data: unknown) =>
      rawRequest('/lab-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Reports
  reports: {
    dashboard: () =>
      rawRequest<ApiResponse<{
        patientsToday: number;
        appointmentsToday: number;
        waitingQueue: number;
        pendingBilling: number;
        todayRevenue: number;
        activeDoctors: number;
      }>>('/reports/dashboard'),
    byDate: (start: string, end: string, groupBy: 'day' | 'week' | 'month' = 'day') =>
      rawRequest<ApiResponse<unknown[]>>(
        `/reports/appointments/by-date?start=${start}&end=${end}&groupBy=${groupBy}`,
      ),
    doctorProductivity: (start?: string, end?: string) => {
      const qs = new URLSearchParams();
      if (start) qs.set('start', start);
      if (end) qs.set('end', end);
      const q = qs.toString();
      return rawRequest<ApiResponse<unknown[]>>(
        `/reports/doctors/productivity${q ? `?${q}` : ''}`,
      );
    },
    financial: (start: string, end: string) =>
      rawRequest<ApiResponse<unknown>>(
        `/reports/financial?start=${start}&end=${end}`,
      ),
    clinical: (start: string, end: string) =>
      rawRequest<ApiResponse<unknown[]>>(
        `/reports/clinical?start=${start}&end=${end}`,
      ),
  },
};

export const apiClient = api; // compatibilidad con código anterior
