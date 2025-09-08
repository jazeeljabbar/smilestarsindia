import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  email: string;
  name: string;
  roles: string[];
  status: string;
}

interface Membership {
  id: number;
  userId: number;
  entityId: number;
  role: string;
  isPrimary: boolean;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
  entity?: {
    id: number;
    name: string;
    type: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeRole: string | null;
  activeMembership: Membership | null;
  memberships: Membership[];
  login: (token: string, user: User) => void;
  logout: () => void;
  switchRole: (role: string) => void;
  switchMembership: (membershipId: number) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeRole, setActiveRole] = useState<string | null>(localStorage.getItem('activeRole'));
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token and get user info
      fetch('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async res => {
          if (!res.ok) {
            throw new Error('Token verification failed');
          }
          return res.json();
        })
        .then(async (userData) => {
          setUser(userData);
          
          // Fetch detailed memberships with entity information
          const membershipsResponse = await fetch('/api/auth/memberships', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          let userMemberships: Membership[] = [];
          if (membershipsResponse.ok) {
            const membershipsData = await membershipsResponse.json();
            userMemberships = membershipsData;
            setMemberships(userMemberships);
          }
          
          // Set active role if not already set or if stored role is not in user's roles
          const storedRole = localStorage.getItem('activeRole');
          if (!storedRole || !userData.roles?.includes(storedRole)) {
            // Default to first role or primary role based on priority
            const defaultRole = getPrimaryRole(userData.roles || []);
            setActiveRole(defaultRole);
            if (defaultRole) {
              localStorage.setItem('activeRole', defaultRole);
            }
          } else {
            setActiveRole(storedRole);
          }
          
          // Set active membership based on active role
          if (userMemberships.length > 0) {
            const currentMembership = userMemberships.find(m => 
              m.role === (storedRole || getPrimaryRole(userData.roles || []))
            );
            if (currentMembership) {
              setActiveMembership(currentMembership);
            }
          }
        })
        .catch((error) => {
          console.warn('Token verification failed:', error);
          // Token is invalid
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (token: string, user: User) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    
    // Set default active role
    const defaultRole = getPrimaryRole(user.roles || []);
    setActiveRole(defaultRole);
    if (defaultRole) {
      localStorage.setItem('activeRole', defaultRole);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setActiveRole(null);
    setActiveMembership(null);
    localStorage.removeItem('token');
    localStorage.removeItem('activeRole');
  };

  const switchRole = (role: string) => {
    if (user?.roles?.includes(role)) {
      setActiveRole(role);
      localStorage.setItem('activeRole', role);
      
      // Update active membership when role changes
      const newMembership = memberships.find(m => m.role === role);
      if (newMembership) {
        setActiveMembership(newMembership);
      }
    }
  };

  const switchMembership = (membershipId: number) => {
    const membership = memberships.find(m => m.id === membershipId);
    if (membership) {
      setActiveMembership(membership);
      setActiveRole(membership.role);
      localStorage.setItem('activeRole', membership.role);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, activeRole, activeMembership, memberships, login, logout, switchRole, switchMembership, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper function to determine primary role based on hierarchy
function getPrimaryRole(roles: string[]): string | null {
  const rolePriority = [
    'SYSTEM_ADMIN',
    'ORG_ADMIN', 
    'FRANCHISE_ADMIN',
    'PRINCIPAL',
    'SCHOOL_ADMIN',
    'TEACHER',
    'DENTIST',
    'PARENT'
  ];
  
  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }
  
  return roles.length > 0 ? roles[0] : null;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
