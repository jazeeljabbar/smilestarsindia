import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { School, Calendar, Users, FileText, Plus, Stethoscope, Building2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertFranchiseSchema, type InsertFranchise } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { ScreeningForm } from '@/components/ScreeningForm';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth.tsx';
import { useLocation } from 'wouter';

export function Dashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [showFranchiseeDialog, setShowFranchiseeDialog] = useState(false);
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
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: UserPlus,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Total Schools',
      value: stats?.totalSchools || 0,
      icon: School,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Franchises',
      value: stats?.totalFranchises || 0,
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
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

  // Franchisee form setup
  const franchiseeForm = useForm<InsertFranchise>({
    resolver: zodResolver(insertFranchiseSchema.omit({ franchiseeUserId: true, agreementStatus: true, agreementAcceptedAt: true, agreementToken: true })),
    defaultValues: {
      name: '',
      region: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      isActive: true,
    },
  });

  const createFranchiseMutation = useMutation({
    mutationFn: async (data: InsertFranchise) => {
      const response = await fetch('/api/franchises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create franchise');
      }
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchises'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setShowFranchiseeDialog(false);
      franchiseeForm.reset();
      toast({
        title: 'Success',
        description: response.message || 'Franchise created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create franchise',
        variant: 'destructive',
      });
    },
  });

  const onFranchiseeSubmit = (data: InsertFranchise) => {
    createFranchiseMutation.mutate(data);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.name}. Here's your overview of dental camp activities.
        </p>
      </div>

      {/* Top Section: Stats Cards + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        {/* Stats Cards - Taking up 3/4 of the width */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>

        {/* Quick Actions - On the right side */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user?.role === 'dentist' && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start"
                  onClick={() => setShowScreeningForm(true)}
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Start Student Screening
                </Button>
              )}
              
              {user?.role === 'admin' && (
                <>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start"
                    onClick={() => setLocation('/users')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Users
                  </Button>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white justify-start"
                    onClick={() => setShowFranchiseeDialog(true)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Create Franchisee
                  </Button>
                </>
              )}
              
              {(user?.role === 'admin' || user?.role === 'franchisee') && (
                <>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white justify-start"
                    onClick={() => setLocation('/schools?register=true')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Register New School
                  </Button>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start"
                    onClick={() => setLocation('/camps')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Camp
                  </Button>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white justify-start"
                    onClick={() => setLocation('/students')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Register Students
                  </Button>
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-start"
                    onClick={() => setLocation('/reports')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Reports
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Camps - Full width below */}
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

      {/* Screening Form Modal */}
      {showScreeningForm && (
        <ScreeningForm
          campId={1} // This should be selected from active camps
          onClose={() => setShowScreeningForm(false)}
          onComplete={() => setShowScreeningForm(false)}
        />
      )}

      {/* Franchisee Creation Dialog */}
      <Dialog open={showFranchiseeDialog} onOpenChange={setShowFranchiseeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Franchisee</DialogTitle>
          </DialogHeader>
          <Form {...franchiseeForm}>
            <form onSubmit={franchiseeForm.handleSubmit(onFranchiseeSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={franchiseeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Franchise Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter franchise name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={franchiseeForm.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mumbai West, Delhi NCR" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Person</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={franchiseeForm.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={franchiseeForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={franchiseeForm.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Address</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={franchiseeForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter complete address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={franchiseeForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={franchiseeForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={franchiseeForm.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode *</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFranchiseeDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFranchiseMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createFranchiseMutation.isPending ? 'Creating...' : 'Create Franchisee'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
