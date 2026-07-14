'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clinicId: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const COOKIE_NAME = 'poli_auth';

function setCookie(value: string | null) {
  if (typeof document === 'undefined') return;
  if (value === null) {
    document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=86400; SameSite=Lax`;
  }
}

export function useAuth(): AuthState {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (stored) {
      try {
        setUser(JSON.parse(stored) as AuthUser);
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setCookie(res.accessToken);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setCookie(null);
    setUser(null);
    router.push('/login');
  }

  return { user, loading, login, logout };
}
