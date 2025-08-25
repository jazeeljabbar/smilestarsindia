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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertCampSchema, type InsertCamp } from '@shared/schema';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';

export function Camps() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<any>(null);

  const { data: camps = [], isLoading: campsLoading } = useQuery({
    queryKey: ['/api/camps'],
    queryFn: () => apiRequest('/camps'),
  });

  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: () => apiRequest('/schools'),
  });

  const form = useForm<InsertCamp>({
    resolver: zodResolver(insertCampSchema.extend({
      startDate: z.date().refine((date) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date >= tomorrow;
      }, {
        message: "Start date must be at least tomorrow",
      }),
      endDate: z.date().refine((date) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date >= tomorrow;
      }, {
        message: "End date must be at least tomorrow",
      }),
      schoolId: z.number().min(1, "Please select a school"),
      expectedStudents: z.number().min(1, "Expected students must be at least 1"),
    }).refine((data) => data.endDate >= data.startDate, {
      message: "End date must be after start date",
      path: ["endDate"],
    })),
    defaultValues: {
      name: '',
      schoolId: 0,
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 172800000), // Day after tomorrow  
      expectedStudents: 50,
      status: 'planned',
      description: '',
      assignedDentistId: null,
      createdBy: user?.id || 0,
    },
  });

  const createCampMutation = useMutation({
    mutationFn: (campData: InsertCamp) => {
      console.log('=== CAMP MUTATION STARTED ===');
      console.log('Sending camp data to API:', campData);
      return apiRequest('/camps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campData),
      });
    },
    onSuccess: (response) => {
      console.log('=== CAMP CREATION SUCCESS ===');
      console.log('API Response:', response);
      queryClient.invalidateQueries({ queryKey: ['/api/camps'] });
      toast({
        title: 'Success',
        description: 'Camp scheduled successfully',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.log('=== CAMP CREATION ERROR ===');
      console.error('API Error:', error);
      console.error('Error message:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule camp',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: InsertCamp) => {
    console.log('=== CAMP FORM SUBMISSION ===');
    console.log('Form data:', data);
    console.log('Form errors:', form.formState.errors);
    console.log('Schools available:', schools.length);
    console.log('Schools with accepted status:', schools.filter((school: any) => school.agreementStatus === 'accepted').length);
    console.log('Current user:', user);
    
    // Check if schools are available
    if (schools.length === 0) {
      console.log('❌ No schools available');
      toast({
        title: 'No Schools Available',
        description: 'Please register schools before scheduling camps.',
        variant: 'destructive',
      });
      return;
    }

    // Check if any schools have accepted agreements
    const acceptedSchools = schools.filter((school: any) => school.agreementStatus === 'accepted');
    if (acceptedSchools.length === 0) {
      console.log('❌ No schools with accepted agreements');
      toast({
        title: 'No Schools with Accepted Agreements',
        description: 'Please ensure at least one school has accepted their agreement before scheduling camps.',
        variant: 'destructive',
      });
      return;
    }

    // Ensure user ID is set
    const campData = {
      ...data,
      createdBy: user?.id || 0,
    };

    console.log('Final camp data:', campData);
    console.log('Submitting camp...');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dental Camps</h1>
          <p className="text-gray-600">
            Schedule and manage dental camps across registered schools
          </p>
        </div>
        {user?.role === 'admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Camp
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Dental Camp</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.log('=== FORM VALIDATION FAILED ===');
                  console.log('Validation errors:', errors);
                  console.log('Form values:', form.getValues());
                })} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Camp Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter camp name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="schoolId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value > 0 ? field.value.toString() : ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select school" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {schools.length === 0 ? (
                                <SelectItem value="0" disabled>No schools available</SelectItem>
                              ) : (
                                schools
                                  .filter((school: any) => school.agreementStatus === 'accepted')
                                  .map((school: any) => (
                                    <SelectItem key={school.id} value={school.id.toString()}>
                                      {school.name} - {school.city}, {school.state}
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                              onChange={(e) => {
                                const newDate = new Date(e.target.value);
                                field.onChange(newDate);
                                // Auto-update end date if it's before the new start date
                                const currentEndDate = form.getValues('endDate');
                                if (currentEndDate < newDate) {
                                  const nextDay = new Date(newDate);
                                  nextDay.setDate(nextDay.getDate() + 1);
                                  form.setValue('endDate', nextDay);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expectedStudents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Students</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Number of students"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planned">Planned</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional camp details and requirements"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCampMutation.isPending}
                      onClick={(e) => {
                        console.log('Submit button clicked');
                        console.log('Form valid:', form.formState.isValid);
                        console.log('Form errors:', form.formState.errors);
                      }}
                    >
                      {createCampMutation.isPending ? 'Scheduling...' : 'Schedule Camp'}
                    </Button>
                  </div>
                </form>
              </Form>
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
