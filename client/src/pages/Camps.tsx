import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Users, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';
import { colorSchemes } from '@/lib/colorSchemes';

export function Camps() {
  const { user, activeRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<any>(null);

  // Simple form state - no complex validation
  const [formData, setFormData] = useState({
    name: '',
    schoolId: '',
    startDate: '',
    endDate: '',
    expectedStudents: '',
    status: 'planned',
    description: '',
  });

  const { data: camps = [], isLoading: campsLoading } = useQuery({
    queryKey: ['/api/camps'],
    queryFn: () => apiRequest('/camps'),
  });

  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: () => apiRequest('/schools'),
  });

  // For school admins, get their specific school
  const { data: mySchool } = useQuery({
    queryKey: ['/api/schools/my-school'],
    queryFn: () => apiRequest('/schools/my-school'),
    enabled: activeRole === 'SCHOOL_ADMIN',
  });

  const createCampMutation = useMutation({
    mutationFn: (campData: any) => {
      return apiRequest('/camps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/camps'] });
      toast({
        title: 'Success',
        description: 'Camp scheduled successfully',
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule camp',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      schoolId: '',
      startDate: '',
      endDate: '',
      expectedStudents: '',
      status: 'planned',
      description: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let schoolId = formData.schoolId;
    
    // For school admins, automatically use their school
    if (activeRole === 'SCHOOL_ADMIN' && mySchool) {
      schoolId = mySchool.id.toString();
    }
    
    // Basic validation
    if (!formData.name || !schoolId || !formData.startDate || !formData.endDate || !formData.expectedStudents) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate dates are in the future
    const startDate = new Date(formData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate <= today) {
      toast({
        title: 'Invalid Date',
        description: 'Camp start date must be in the future',
        variant: 'destructive',
      });
      return;
    }

    // For admin/franchisee roles, check accepted schools
    if (activeRole !== 'SCHOOL_ADMIN') {
      const acceptedSchools = schools.filter((school: any) => school.agreementStatus === 'accepted');
      if (acceptedSchools.length === 0) {
        toast({
          title: 'No Schools Available',
          description: 'No schools with accepted agreements found',
          variant: 'destructive',
        });
        return;
      }
    }

    // Prepare data for API
    const campData = {
      name: formData.name,
      schoolId: parseInt(schoolId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      expectedStudents: parseInt(formData.expectedStudents),
      status: formData.status,
      description: formData.description,
      assignedDentistId: null,
      createdBy: user?.id || 0,
    };

    createCampMutation.mutate(campData);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { className: 'bg-green-100 text-green-800' },
      planned: { className: 'bg-yellow-100 text-yellow-800' },
      completed: { className: 'bg-gray-100 text-gray-800' },
    };
    return variants[status] || variants.planned;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (campsLoading || schoolsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">
            Schedule and manage dental camps across registered schools
          </p>
          {/* Show role-specific context information */}
          {activeRole && (
            <div className="mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                <Calendar className="h-4 w-4 mr-2" />
                {activeRole.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} - Camps Management
              </span>
            </div>
          )}
        </div>
        {(user?.role === 'admin' || user?.role === 'franchisee') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className={colorSchemes.camps.primary}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Camp
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Dental Camp</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Camp Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter camp name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* School selection - only show for non-school admin roles */}
                  {activeRole !== 'SCHOOL_ADMIN' && (
                    <div className="space-y-2">
                      <Label htmlFor="schoolId">School</Label>
                      <Select 
                        value={formData.schoolId} 
                        onValueChange={(value) => setFormData({ ...formData, schoolId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select school" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools
                            .filter((school: any) => school.agreementStatus === 'accepted')
                            .map((school: any) => (
                              <SelectItem key={school.id} value={school.id.toString()}>
                                {school.name} - {school.city}, {school.state}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* For school admins, show their school info */}
                  {activeRole === 'SCHOOL_ADMIN' && mySchool && (
                    <div className="space-y-2">
                      <Label>School</Label>
                      <div className="px-3 py-2 bg-gray-50 border rounded-md">
                        <p className="font-medium">{mySchool.name}</p>
                        <p className="text-sm text-gray-600">{mySchool.city}, {mySchool.state}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedStudents">Expected Students</Label>
                    <Input
                      id="expectedStudents"
                      type="number"
                      placeholder="Number of students"
                      value={formData.expectedStudents}
                      onChange={(e) => setFormData({ ...formData, expectedStudents: e.target.value })}
                      min="1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Additional camp details and requirements"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCampMutation.isPending}>
                    {createCampMutation.isPending ? 'Scheduling...' : 'Schedule Camp'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-blue-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Camps</p>
                <p className="text-2xl font-semibold text-gray-900">{camps.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Camps</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {camps.filter((camp: any) => camp.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-yellow-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Planned Camps</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {camps.filter((camp: any) => camp.status === 'planned').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="text-gray-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {camps.reduce((sum: number, camp: any) => sum + (camp.studentsCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Camps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Camp Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {camps.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{camp.name}</div>
                      {camp.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {camp.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {camp.school?.name || 'Unknown School'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {camp.school?.city}, {camp.school?.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(camp.startDate)} - {formatDate(camp.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        {camp.screeningsCount || 0} / {camp.expectedStudents}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge {...getStatusBadge(camp.status)}>
                        {camp.status.charAt(0).toUpperCase() + camp.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {user?.role === 'admin' && (
                        <>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {camps.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No camps scheduled</h3>
            <p className="text-gray-600 mb-4">
              Get started by scheduling your first dental camp.
            </p>
            {user?.role === 'admin' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule First Camp
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
