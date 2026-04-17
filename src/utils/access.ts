export type AppRole = 'server' | 'cashier' | 'manager' | 'admin' | 'stockist';

export function getHomeRouteForRole(role?: AppRole | null): string {
  switch (role) {
    case 'server':
      return '/(server)/tables';
    case 'cashier':
      return '/(cashier)/caisse';
    case 'stockist':
      return '/(manager)/stock';
    case 'manager':
    case 'admin':
      return '/(manager)/dashboard';
    default:
      return '/login';
  }
}

export function canAccessServer(role?: AppRole | null): boolean {
  return role === 'server';
}

export function canAccessCashier(role?: AppRole | null): boolean {
  return role === 'cashier';
}

export function canAccessManager(role?: AppRole | null): boolean {
  return role === 'manager' || role === 'admin';
}

export function canAccessStock(role?: AppRole | null): boolean {
  return role === 'stockist' || role === 'manager' || role === 'admin';
}