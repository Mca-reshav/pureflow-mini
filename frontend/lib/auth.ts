'use client';

const ACCESS_TOKEN_KEY = 'pureflow_access_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  document.cookie = 'pureflow_auth=1; path=/; SameSite=Lax';
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  document.cookie = 'pureflow_auth=; Max-Age=0; path=/';
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const token = data?.data?.accessToken ?? null;
    if (token) setAccessToken(token);
    return token;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}