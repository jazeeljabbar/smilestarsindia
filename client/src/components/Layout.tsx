import { Link, useLocation } from 'wouter';
import { Smile, Bell, User, LogOut, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth.tsx';
import { getColorScheme, colorSchemes } from '@/lib/colorSchemes';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, activeRole, logout, switchRole } = useAuth();
  const [location, setLocation] = useLocation();

  // Role display names
  const roleDisplayNames: { [key: string]: string } = {
    'SYSTEM_ADMIN': 'System Admin',
    'ORG_ADMIN': 'Org Admin',
    'FRANCHISE_ADMIN': 'Franchise Admin',
    'PRINCIPAL': 'Principal',
    'SCHOOL_ADMIN': 'School Admin',
    'TEACHER': 'Teacher',
    'DENTIST': 'Dentist',
    'PARENT': 'Parent'
  };

  // Dashboard paths for each role
  const roleDashboards: { [key: string]: string } = {
    'SYSTEM_ADMIN': '/dashboard',
    'ORG_ADMIN': '/dashboard',
    'FRANCHISE_ADMIN': '/dashboard', // Will redirect to FranchiseeDashboard
    'PRINCIPAL': '/dashboard',       // Will redirect to SchoolAdminDashboard
    'SCHOOL_ADMIN': '/dashboard',    // Will redirect to SchoolAdminDashboard
    'TEACHER': '/dashboard',
    'DENTIST': '/dashboard',
    'PARENT': '/parent-portal'
  };

  const handleRoleSwitch = (newRole: string) => {
    switchRole(newRole);
    // Navigate to appropriate dashboard for the new role
    const dashboardPath = roleDashboards[newRole] || '/dashboard';
    setLocation(dashboardPath);
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home', colorScheme: 'dashboard' },
    { name: 'Users', href: '/users', icon: 'user-cog', adminOnly: true, colorScheme: 'users' },
    { name: 'Franchisees', href: '/franchisees', icon: 'building-2', adminOnly: true, colorScheme: 'franchisees' },
    { name: 'Schools', href: '/schools', icon: 'school', colorScheme: 'schools' },
    { name: 'Camps', href: '/camps', icon: 'calendar', colorScheme: 'camps' },
    { name: 'Students', href: '/students', icon: 'users', colorScheme: 'students' },
    { name: 'Reports', href: '/reports', icon: 'file-text', colorScheme: 'reports' },
  ];

  // Helper function to check if user has specific role
  const hasRole = (role: string) => user?.roles?.includes(role) || false;
  const hasAnyRole = (roles: string[]) => user?.roles?.some(r => roles.includes(r)) || false;

  const filteredNavigation = navigation.filter(item => {
    if (!user?.roles) return false;
    
    // Admin-only items - different levels of access
    if (item.adminOnly) {
      // Users page is only for System Admin
      if (item.name === 'Users' && !hasRole('SYSTEM_ADMIN')) {
        return false;
      }
      // Franchisees page is only for System Admin and Org Admin (not for Franchise Admin)
      if (item.name === 'Franchisees' && !hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN'])) {
        return false;
      }
      // Other admin items for any admin role
      if (item.name !== 'Users' && item.name !== 'Franchisees' && !hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'])) {
        return false;
      }
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
      {filteredNavigation.map((item) => {
        const colors = colorSchemes[item.colorScheme as keyof typeof colorSchemes];
        const isActive = location === item.href;
        
        return (
          <Link 
            key={item.name} 
            href={item.href} 
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? colors.active
                : `text-gray-500 hover:${colors.text}`
            }`}
          >
            {item.name}
          </Link>
        );
      })}
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
                  <div className="text-xs text-gray-500">
                    {activeRole ? roleDisplayNames[activeRole] || activeRole : 'No role selected'}
                  </div>
                </div>
                
                {/* Role Switcher Dropdown */}
                {user?.roles && user.roles.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="hidden md:flex items-center space-x-1">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {user.roles.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleRoleSwitch(role)}
                          className={activeRole === role ? 'bg-blue-50 text-blue-700' : ''}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{roleDisplayNames[role] || role}</span>
                            {activeRole === role && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

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
                    {/* Mobile User Info */}
                    <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                        <div className="text-xs text-gray-500">
                          {activeRole ? roleDisplayNames[activeRole] || activeRole : 'No role selected'}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Role Switcher */}
                    {user?.roles && user.roles.length > 1 && (
                      <div className="pb-4 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-900 mb-2">Switch Role</div>
                        <div className="space-y-1">
                          {user.roles.map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleSwitch(role)}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                activeRole === role 
                                  ? 'bg-blue-50 text-blue-700 font-medium' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{roleDisplayNames[role] || role}</span>
                                {activeRole === role && (
                                  <div className="h-2 w-2 bg-blue-600 rounded-full" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <NavItems />
                    
                    {/* Mobile Logout */}
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={logout}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
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
