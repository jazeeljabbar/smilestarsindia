import { Link, useLocation } from 'wouter';
import { Smile, Bell, User, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth.tsx';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home' },
    { name: 'Users', href: '/users', icon: 'user-cog', adminOnly: true },
    { name: 'Franchisees', href: '/franchisees', icon: 'building-2', adminOnly: true },
    { name: 'Schools', href: '/schools', icon: 'school' },
    { name: 'Camps', href: '/camps', icon: 'calendar' },
    { name: 'Students', href: '/students', icon: 'users' },
    { name: 'Reports', href: '/reports', icon: 'file-text' },
  ];

  // Helper function to check if user has specific role
  const hasRole = (role: string) => user?.roles?.includes(role) || false;
  const hasAnyRole = (roles: string[]) => user?.roles?.some(r => roles.includes(r)) || false;

  const filteredNavigation = navigation.filter(item => {
    if (!user?.roles) return false;
    
    // Admin-only items - check for any admin role
    if (item.adminOnly && !hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'])) {
      return false;
    }
    
    // Parent users only see Reports
    if (hasRole('PARENT') && !hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN'])) {
      return item.name === 'Reports';
    }
    
    // School-level roles see limited navigation
    if (hasAnyRole(['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER']) && !hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'])) {
      return ['Dashboard', 'Students', 'Camps', 'Reports'].includes(item.name);
    }
    
    return true;
  });

  const NavItems = () => (
    <>
      {filteredNavigation.map((item) => (
        <Link key={item.name} href={item.href} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          location === item.href
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}>
          {item.name}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center mr-8">
                <img src="/logo.png" alt="Smile Stars India" className="h-8 w-8 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Smile Stars India</h1>
              </div>
            </div>
              
            <nav className="hidden md:flex space-x-6 flex-1 justify-center">
              <NavItems />
            </nav>

            <div className="flex items-center space-x-3 flex-shrink-0">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500">
                <Bell className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.roles?.join(', ').replace(/_/g, ' ').toLowerCase() || 'No roles'}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <div className="flex flex-col space-y-4 mt-8">
                    <NavItems />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
