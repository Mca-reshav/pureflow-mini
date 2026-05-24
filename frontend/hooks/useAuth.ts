'use client';

import { useAuthContext } from '../context/AuthContext';

export function useAuth() {
  return useAuthContext();
}

export function usePermission(key: string): boolean {
  const { permissions } = useAuthContext();
  if (!permissions) return false;
  return permissions[key as keyof typeof permissions] ?? false;
}