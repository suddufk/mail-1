import { useAppStore } from '@/store/app-store';

export function hasPerm(permKey: string | string[]) {
  const permKeys = useAppStore.getState().user.permKeys || [];
  if (permKeys.includes('*')) return true;
  if (Array.isArray(permKey)) return permKey.some((key) => permKeys.includes(key));
  return permKeys.includes(permKey);
}

export function requirePerm(permKey?: string | string[]) {
  if (!permKey) return true;
  return hasPerm(permKey);
}
