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
  const { user, activeRole, activeMembership, memberships, logout, switchRole, switchMembership } = useAuth();
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

  const handleMembershipSwitch = (membershipId: number) => {
    switchMembership(membershipId);
    const membership = memberships.find(m => m.id === membershipId);
    if (membership) {
      const dashboardPath = roleDashboards[membership.role] || '/dashboard';
      setLocation(dashboardPath);
    }
  };

  // Get unique memberships (deduplicate same role+entity combinations)
  const uniqueMemberships = memberships.reduce((acc: any[], membership) => {
    const existing = acc.find(m =>
      m.role === membership.role && m.entityId === membership.entityId
    );
    if (!existing) {
      acc.push(membership);
    }
    return acc;
  }, []);

  // Generate display names for memberships
  const getMembershipDisplayName = (membership: any) => {
    const roleName = roleDisplayNames[membership.role] || membership.role;
    const entityName = membership.entity?.name || `Entity ${membership.entityId}`;
    return `${roleName} - ${entityName}`;
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home', colorScheme: 'dashboard' },
    { name: 'Franchisees', href: '/franchisees', icon: 'building-2', adminOnly: true, colorScheme: 'franchisees' },
    { name: 'Schools', href: '/schools', icon: 'school', colorScheme: 'schools' },
    { name: 'Camps', href: '/camps', icon: 'calendar', colorScheme: 'camps' },
    { name: 'Students', href: '/students', icon: 'users', colorScheme: 'students' },
    {
      name: 'Admin',
      icon: 'shield',
      colorScheme: 'users', // Fallback
      children: [
        { name: 'Users', href: '/users', icon: 'user-cog', adminOnly: true },
        { name: 'Twinky Corner', href: '/content', icon: 'smile', colorScheme: 'reports' },
        { name: 'Reports', href: '/reports', icon: 'file-text', colorScheme: 'reports' }
      ]
    }
  ];

  // Helper function to check if user has specific role
  const hasRole = (role: string) => user?.roles?.includes(role) || false;
  const hasAnyRole = (roles: string[]) => user?.roles?.some(r => roles.includes(r)) || false;

  // Enhance filter to handle nested items
  const filterItem = (item: any) => {
    if (!user?.roles) return false;

    // Handle custom "Admin" group visibility
    if (item.name === 'Admin') {
      // Admin group is visible if at least one child is visible
      return item.children.some((child: any) => filterItem(child));
    }

    // 1. Check strict adminOnly flag
    if (item.adminOnly) {
      if (item.name === 'Users' && !hasRole('SYSTEM_ADMIN')) return false;
      if (item.name === 'Franchisees' && !hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN'])) return false;
      // Generic admin check
      if (!hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'])) return false;
    }

    // 2. Role-based whitelisting for non-admin roles (Parent, Teacher, etc)
    // If user is PURELY a parent/teacher (no admin roles), check whitelist
    if (!hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'])) {
      const allowed = ['Dashboard', 'Students', 'Reports', 'Twinky Corner'];
      if (!allowed.find(a => a === item.name)) return false;
    }

    // School Admin / Principal restrictions
    if (hasAnyRole(['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER']) && !hasAnyRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'])) {
      const allowed = ['Dashboard', 'Students', 'Camps', 'Reports', 'Twinky Corner', 'Schools']; // Schools might be read-only? Added Schools to list as requested order implies visibility
      // Actually, Schools is requested in main menu. Let's allow it if it was allowed before.
      // Previous logic: ['Dashboard', 'Students', 'Camps', 'Reports']
      // Requested order includes Schools. Assuming School Admin can see their own school details usually.
      // Let's stick to safe defaults.
      const extendedAllowed = ['Dashboard', 'Students', 'Camps', 'Reports', 'Twinky Corner', 'Schools'];
      if (!extendedAllowed.find(a => a === item.name || (item.name === 'Admin' && false))) {
        // logic handled by recursion for Admin group
      }
      if (!extendedAllowed.includes(item.name)) return false;
    }

    return true;
  };

  const filteredNavigation = navigation.reduce((acc: any[], item) => {
    if (item.children) {
      const filteredChildren = item.children.filter(filterItem);
      if (filteredChildren.length > 0) {
        acc.push({ ...item, children: filteredChildren });
      }
    } else {
      if (filterItem(item)) {
        acc.push(item);
      }
    }
    return acc;
  }, []);

  const NavItems = () => (
    <>
      {filteredNavigation.map((item) => {
        if (item.children) {
          return (
            <DropdownMenu key={item.name}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-3 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary/5 flex items-center gap-1">
                  {item.name} <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {item.children.map((child: any) => (
                  <DropdownMenuItem key={child.name} asChild>
                    <Link href={child.href} className="w-full cursor-pointer">
                      {child.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        const isActive = location === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${isActive
              ? 'bg-primary text-white shadow-md'
              : `text-gray-600 hover:text-primary hover:bg-primary/5`
              }`}
          >
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-[#F9F7F4]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section - Fixed Width */}
            <div className="flex items-center flex-shrink-0 w-64">
              <Link href="/dashboard">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm border border-border">
                    <img src="/logo.png" alt="Smile Stars India" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-primary tracking-tight leading-none">smyl stars india</h1>
                    <span className="text-[0.6rem] text-muted-foreground font-medium tracking-wider uppercase">Safeguarding Little Smiles</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Navigation - Centered */}
            <nav className="hidden md:flex space-x-6 flex-1 justify-center">
              <NavItems />
            </nav>

            {/* User Controls - Fixed Width */}
            <div className="flex items-center space-x-3 flex-shrink-0 w-64 justify-end">
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
                    {activeMembership ? getMembershipDisplayName(activeMembership) :
                      activeRole ? roleDisplayNames[activeRole] || activeRole : 'No role selected'}
                  </div>
                </div>

                {/* Membership Switcher Dropdown */}
                {uniqueMemberships.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="hidden md:flex items-center space-x-1">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {uniqueMemberships.map((membership) => (
                        <DropdownMenuItem
                          key={membership.id}
                          onClick={() => handleMembershipSwitch(membership.id)}
                          className={activeMembership?.id === membership.id ? 'bg-blue-50 text-blue-700' : ''}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm">{getMembershipDisplayName(membership)}</span>
                            {activeMembership?.id === membership.id && (
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
                          {activeMembership ? getMembershipDisplayName(activeMembership) :
                            activeRole ? roleDisplayNames[activeRole] || activeRole : 'No role selected'}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Membership Switcher */}
                    {uniqueMemberships.length > 1 && (
                      <div className="pb-4 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-900 mb-2">Switch Role</div>
                        <div className="space-y-1">
                          {uniqueMemberships.map((membership) => (
                            <button
                              key={membership.id}
                              onClick={() => handleMembershipSwitch(membership.id)}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeMembership?.id === membership.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{getMembershipDisplayName(membership)}</span>
                                {activeMembership?.id === membership.id && (
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
