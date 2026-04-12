import { User } from '../types';

export function canAccessServer(user: User | null) {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'server' ||
    user.role === 'manager' ||
    user.role === 'admin'
  );
}

export function canCreateCounterOrder(user: User | null) {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'cashier' ||
    user.role === 'manager' ||
    user.role === 'admin'
  );
}

export function canAccessCashier(user: User | null) {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'cashier' ||
    user.role === 'manager' ||
    user.role === 'admin'
  );
}

export function canAccessManager(user: User | null) {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'manager' ||
    user.role === 'admin'
  );
}

export function canAccessStock(user: User | null) {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'stockist' ||
    user.role === 'manager' ||
    user.role === 'admin'
  );
}

export function canManageUsers(user: User | null) {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'admin' ||
    user.role === 'manager'
  );
}

export function canChangeGlobalSettings(user: User | null) {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'admin' ||
    user.role === 'manager'
  );
}