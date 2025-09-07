// Color schemes for different entity types
export const colorSchemes = {
  users: {
    primary: 'bg-purple-600 hover:bg-purple-700',
    light: 'bg-purple-50 hover:bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-200',
    active: 'text-purple-600 border-b-2 border-purple-600',
    icon: 'text-purple-500',
    gradient: 'from-purple-500 to-purple-600'
  },
  franchisees: {
    primary: 'bg-blue-600 hover:bg-blue-700',
    light: 'bg-blue-50 hover:bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-200',
    active: 'text-blue-600 border-b-2 border-blue-600',
    icon: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-600'
  },
  schools: {
    primary: 'bg-green-600 hover:bg-green-700',
    light: 'bg-green-50 hover:bg-green-100',
    text: 'text-green-600',
    border: 'border-green-200',
    active: 'text-green-600 border-b-2 border-green-600',
    icon: 'text-green-500',
    gradient: 'from-green-500 to-green-600'
  },
  camps: {
    primary: 'bg-orange-600 hover:bg-orange-700',
    light: 'bg-orange-50 hover:bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-200',
    active: 'text-orange-600 border-b-2 border-orange-600',
    icon: 'text-orange-500',
    gradient: 'from-orange-500 to-orange-600'
  },
  students: {
    primary: 'bg-teal-600 hover:bg-teal-700',
    light: 'bg-teal-50 hover:bg-teal-100',
    text: 'text-teal-600',
    border: 'border-teal-200',
    active: 'text-teal-600 border-b-2 border-teal-600',
    icon: 'text-teal-500',
    gradient: 'from-teal-500 to-teal-600'
  },
  reports: {
    primary: 'bg-indigo-600 hover:bg-indigo-700',
    light: 'bg-indigo-50 hover:bg-indigo-100',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    active: 'text-indigo-600 border-b-2 border-indigo-600',
    icon: 'text-indigo-500',
    gradient: 'from-indigo-500 to-indigo-600'
  },
  dashboard: {
    primary: 'bg-gray-600 hover:bg-gray-700',
    light: 'bg-gray-50 hover:bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    active: 'text-gray-600 border-b-2 border-gray-600',
    icon: 'text-gray-500',
    gradient: 'from-gray-500 to-gray-600'
  }
};

export type ColorSchemeKey = keyof typeof colorSchemes;

export function getColorScheme(path: string): ColorSchemeKey {
  if (path.includes('/users')) return 'users';
  if (path.includes('/franchisees')) return 'franchisees';
  if (path.includes('/schools')) return 'schools';
  if (path.includes('/camps')) return 'camps';
  if (path.includes('/students')) return 'students';
  if (path.includes('/reports')) return 'reports';
  return 'dashboard';
}

export function getColorClass(path: string, type: 'primary' | 'light' | 'text' | 'border' | 'active' | 'icon' | 'gradient'): string {
  const scheme = getColorScheme(path);
  return colorSchemes[scheme][type];
}

// Helper function to get color classes for buttons
export function getButtonColors(section: ColorSchemeKey) {
  return colorSchemes[section];
}