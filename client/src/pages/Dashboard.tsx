import { useQuery } from '@tanstack/react-query';
import { School, Calendar, Users, FileText, Plus, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScreeningForm } from '@/components/ScreeningForm';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth.tsx';
import { useLocation } from 'wouter';

export function Dashboard() {
  const { user } = useAuth();
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [, setLocation] = useLocation();

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => apiRequest('/dashboard/stats'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['/api/camps'],
    queryFn: () => apiRequest('/camps'),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
    queryFn: () => apiRequest('/students'),
    enabled: user?.role === 'school_admin' || user?.role === 'admin',
  });

  const { data: screenings = [] } = useQuery({
    queryKey: ['/api/screenings'],
    queryFn: () => apiRequest('/screenings'),
    enabled: user?.role === 'parent' || user?.role === 'admin',
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['/api/reports'],
    queryFn: () => apiRequest('/reports'),
    enabled: user?.role === 'parent' || user?.role === 'admin',
  });

  const statsCards = [
    {
      title: 'Total Schools',
      value: stats?.totalSchools || 0,
      icon: School,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Camps',
      value: stats?.activeCamps || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Students Screened',
      value: stats?.studentsScreened || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Reports Generated',
      value: stats?.reportsGenerated || 0,
      icon: FileText,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', className: 'bg-green-100 text-green-800' },
      planned: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      completed: { variant: 'outline', className: 'bg-gray-100 text-gray-800' },
    };
    return variants[status] || variants.planned;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.name}. Here's your overview of dental camp activities.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`${stat.color} h-6 w-6`} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Camps */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Camps</CardTitle>
                {(user?.role === 'admin' || user?.role === 'franchisee') && (
                  <Button onClick={() => setLocation('/camps')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Camp
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        School
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {camps.slice(0, 5).map((camp: any) => (
                      <tr key={camp.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {camp.school?.name || 'Unknown School'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {camp.school?.city}, {camp.school?.state}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {camp.screeningsCount || 0} / {camp.expectedStudents}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge {...getStatusBadge(camp.status)}>
                            {camp.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(user?.role === 'dentist' || user?.role === 'admin') && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowScreeningForm(true)}
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Start Student Screening
                </Button>
              )}
              
              {(user?.role === 'admin' || user?.role === 'franchisee') && (
                <>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setLocation('/schools?register=true')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Register New School
                  </Button>
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => setLocation('/reports')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Reports
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">Camp completed successfully</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">New dentist assigned</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Screening Form Modal */}
      {showScreeningForm && (
        <ScreeningForm
          campId={1} // This should be selected from active camps
          onClose={() => setShowScreeningForm(false)}
          onComplete={() => setShowScreeningForm(false)}
        />
      )}
    </div>
  );
}
