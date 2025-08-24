import { useQuery } from '@tanstack/react-query';
import { School, Calendar, Users, FileText, Plus, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth.tsx';
import { useLocation } from 'wouter';
import { FranchiseAgreementModal } from '@/components/FranchiseAgreementModal';
import { useState, useEffect } from 'react';

export function FranchiseeDashboard() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Fetch franchisee-specific data
  const { data: franchise } = useQuery({
    queryKey: ['/api/franchises/my-franchise'],
    queryFn: async () => {
      const response = await fetch('/api/franchises/my-franchise', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch franchise data');
      return response.json();
    },
    enabled: !!user && user.role === 'franchisee',
  });

  // Show agreement modal on first login if not accepted
  useEffect(() => {
    if (franchise && franchise.agreementStatus !== 'accepted') {
      setShowAgreementModal(true);
    }
  }, [franchise]);

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: async () => {
      const response = await fetch('/api/schools', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch schools');
      return response.json();
    },
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['/api/camps'],
    queryFn: async () => {
      const response = await fetch('/api/camps', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch camps');
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>;
      case 'planned':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Planned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate statistics
  const stats = [
    {
      title: 'Total Schools',
      value: schools.length,
      icon: School,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Camps',
      value: camps.filter((camp: any) => camp.status === 'active').length,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Students',
      value: camps.reduce((sum: number, camp: any) => sum + (camp.screeningsCount || 0), 0),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Completed Camps',
      value: camps.filter((camp: any) => camp.status === 'completed').length,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <>
      <FranchiseAgreementModal 
        isOpen={showAgreementModal} 
        onClose={() => setShowAgreementModal(false)} 
      />
      
      <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <p className="text-blue-100">
              {franchise ? `Managing ${franchise.name} - ${franchise.region}` : 'Franchisee Dashboard'}
            </p>
          </div>
          <Building2 className="h-12 w-12 text-blue-200" />
        </div>
      </div>

      {/* Franchise Information */}
      {franchise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Franchise Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Franchise Name</p>
                <p className="text-lg font-semibold">{franchise.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Region</p>
                <p className="text-lg font-semibold">{franchise.region}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge className={
                  franchise.agreementStatus === 'accepted' 
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                }>
                  {franchise.agreementStatus === 'accepted' ? 'Active' : 'Pending Agreement'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
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
        {/* Recent Schools */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Schools</CardTitle>
                <Button onClick={() => setLocation('/schools')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add School
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        School Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {schools.slice(0, 5).map((school: any) => (
                      <tr key={school.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{school.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {school.city}, {school.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {school.contactPersonName}
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
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setLocation('/schools?register=true')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Register New School
              </Button>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation('/camps')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Camp
              </Button>
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={() => setLocation('/reports')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">New school registered</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">Camp scheduled</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}