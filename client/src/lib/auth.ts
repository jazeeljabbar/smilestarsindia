// Authentication utilities and types
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'dentist' | 'school_admin' | 'parent';
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

export const removeStoredToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const hasRole = (user: AuthUser | null, roles: string[]): boolean => {
  return user ? roles.includes(user.role) : false;
};

export const canAccessRoute = (user: AuthUser | null, route: string): boolean => {
  if (!user) return false;
  
  switch (user.role) {
    case 'admin':
      return true; // Admin can access all routes
    case 'dentist':
      return ['/', '/dashboard', '/students', '/camps', '/reports'].includes(route);
    case 'school_admin':
      return ['/', '/dashboard', '/students'].includes(route);
    case 'parent':
      return ['/', '/dashboard', '/parent-portal', '/reports'].includes(route);
    default:
      return false;
  }
};

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'dentist':
      return 'Dentist';
    case 'school_admin':
      return 'School Administrator';
    case 'parent':
      return 'Parent';
    default:
      return 'User';
  }
};

export const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};
