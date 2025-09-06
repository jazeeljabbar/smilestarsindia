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

  const filteredNavigation = navigation.filter(item => {
    // Admin-only items
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    
    if (user?.role === 'parent') {
      return item.name === 'Reports';
    }
    if (user?.role === 'school_admin') {
      return ['Dashboard', 'Students'].includes(item.name);
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Smile Stars India" className="h-8 w-8 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Smile Stars India</h1>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <NavItems />
            </nav>

            <div className="flex items-center space-x-4">
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
                  <div className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</div>
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
