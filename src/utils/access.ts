// src/utils/access.ts

import { User } from '../types';

export function canAccessServer(user: User | null) {
  return !!user && (user.role === 'server' || user.role === 'manager');
}

export function canAccessCashier(user: User | null) {
  return !!user && (user.role === 'cashier' || user.role === 'manager');
}

export function canAccessManager(user: User | null) {
  return !!user && user.role === 'manager';
}

export function canCreateCounterOrder(user: User | null) {
  return !!user && (user.role === 'cashier' || user.role === 'manager');
}