import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, MapPin, Phone, Mail, Building2, Users, GitBranch, Trash2, MoreVertical, CheckCircle, Clock, XCircle, GraduationCap } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertSchoolSchema, type InsertSchool } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';

export function Schools() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [location] = useLocation();

  // Auto-open dialog if coming from dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('register') === 'true') {
      setIsDialogOpen(true);
      // Clean up URL without causing navigation
      window.history.replaceState({}, '', '/schools');
    }
  }, [location]);

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: async () => {
      const response = await fetch('/api/schools', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch schools');
      return response.json();
    },
  });

  // Fetch franchises for selection
  const { data: franchises = [] } = useQuery({
    queryKey: ['/api/franchises'],
    queryFn: async () => {
      const response = await fetch('/api/franchises', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch franchises');
      return response.json();
    },
    enabled: user?.role === 'admin' || user?.role === 'franchisee',
  });

  // Check if there are accepted franchisees
  const acceptedFranchises = franchises.filter((f: any) => f.agreementStatus === 'accepted');
  const hasAcceptedFranchisees = acceptedFranchises.length > 0;

  // Fetch parent schools for sub-branch selection
  const { data: parentSchools = [] } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: async () => {
      const response = await fetch('/api/schools', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch schools');
      return response.json();
    },
  });

  const form = useForm<InsertSchool>({
    resolver: zodResolver(insertSchoolSchema.omit({ adminUserId: true, agreementStatus: true, agreementAcceptedAt: true, agreementToken: true })),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      registrationNumber: '',
      franchiseId: user?.role === 'franchisee' ? franchises.find((f: any) => f.franchiseeUserId === user.id)?.id : undefined,
      hasSubBranches: false,
      parentSchoolId: undefined,
      isActive: true,
    },
  });

  // Reset form when editing school changes
  useEffect(() => {
    if (editingSchool) {
      form.reset({
        name: editingSchool.name || '',
        address: editingSchool.address || '',
        city: editingSchool.city || '',
        state: editingSchool.state || '',
        pincode: editingSchool.pincode || '',
        contactPerson: editingSchool.contactPerson || '',
        contactPhone: editingSchool.contactPhone || '',
        contactEmail: editingSchool.contactEmail || '',
        registrationNumber: editingSchool.registrationNumber || '',
        franchiseId: editingSchool.franchiseId || undefined,
        hasSubBranches: editingSchool.hasSubBranches || false,
        parentSchoolId: editingSchool.parentSchoolId || undefined,
        isActive: editingSchool.isActive ?? true,
      });
    } else {
      form.reset({
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        registrationNumber: '',
        franchiseId: user?.role === 'franchisee' ? franchises.find((f: any) => f.franchiseeUserId === user.id)?.id : undefined,
        hasSubBranches: false,
        parentSchoolId: undefined,
        isActive: true,
      });
    }
  }, [editingSchool, form, franchises, user?.role]);

  const createSchoolMutation = useMutation({
    mutationFn: async (schoolData: InsertSchool) => {
      const url = editingSchool ? `/api/schools/${editingSchool.id}` : '/api/schools';
      const method = editingSchool ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(schoolData),
      });
      if (!response.ok) {
        throw new Error(editingSchool ? 'Failed to update school' : 'Failed to create school');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      toast({
        title: 'Success',
        description: editingSchool ? 'School updated successfully' : 'School registered successfully',
      });
      setIsDialogOpen(false);
      setEditingSchool(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: editingSchool ? 'Failed to update school' : 'Failed to register school',
        variant: 'destructive',
      });
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      const response = await fetch(`/api/schools/${schoolId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete school' }));
        throw new Error(errorData.error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      toast({
        title: 'Success',
        description: 'School deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cannot Delete School',
        description: error.message,
        variant: 'destructive',
        duration: 6000, // Show longer for dependency messages
      });
    },
  });

  const onSubmit = (data: InsertSchool) => {
    createSchoolMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Schools</h1>
          <p className="text-gray-600">
            Manage registered schools and their information
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'franchisee') && (
          <div className="flex items-center space-x-2">
            {user?.role === 'admin' && !hasAcceptedFranchisees && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                ⚠️ Create a franchisee first to enable school registration
              </div>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingSchool(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  className={hasAcceptedFranchisees 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-gray-400 cursor-not-allowed"
                  }
                  disabled={!hasAcceptedFranchisees}
                  title={!hasAcceptedFranchisees ? "Create and approve a franchisee first" : ""}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Register School
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSchool ? 'Edit School' : 'Register New School'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter school name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration Number</FormLabel>
                            <FormControl>
                              <Input placeholder="School registration number" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Franchise & Hierarchy */}
                  {user?.role === 'admin' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Franchise & Hierarchy</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="franchiseId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Franchise</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select franchise" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {franchises.map((franchise: any) => (
                                    <SelectItem key={franchise.id} value={franchise.id.toString()}>
                                      {franchise.name} - {franchise.city}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="parentSchoolId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parent School (for sub-branches)</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} value={field.value?.toString() || "none"}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select parent school (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No parent school</SelectItem>
                                  {parentSchools.filter((s: any) => !s.parentSchoolId).map((school: any) => (
                                    <SelectItem key={school.id} value={school.id.toString()}>
                                      {school.name} - {school.city}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="hasSubBranches"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Has Sub-branches</FormLabel>
                              <FormDescription>
                                Check if this school has multiple branches or campuses
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Person</FormLabel>
                            <FormControl>
                              <Input placeholder="Principal/Administrator name" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email address" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="Complete address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
                        name="pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode</FormLabel>
                            <FormControl>
                              <Input placeholder="Pincode" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createSchoolMutation.isPending}>
                      {createSchoolMutation.isPending 
                        ? (editingSchool ? 'Updating...' : 'Registering...') 
                        : (editingSchool ? 'Update School' : 'Register School')
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.map((school: any) => (
          <Card key={school.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    {school.name}
                    {school.parentSchoolId && (
                      <Badge variant="outline" className="text-xs">
                        <GitBranch className="h-3 w-3 mr-1" />
                        Branch
                      </Badge>
                    )}
                    {school.hasSubBranches && (
                      <Badge variant="secondary" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        Multi-Branch
                      </Badge>
                    )}
                  </CardTitle>
                  {school.registrationNumber && (
                    <p className="text-sm text-gray-500 mt-1">Reg: {school.registrationNumber}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{school.city}, {school.state}</p>
                </div>
                <div className="flex items-center gap-2">
                  {school.agreementStatus && getStatusIcon(school.agreementStatus)}
                  {school.agreementStatus && getStatusBadge(school.agreementStatus)}
                  {(user?.role === 'admin' || user?.role === 'franchisee') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingSchool(school);
                          setIsDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit School
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete School
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the school
                                "{school.name}" and all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSchoolMutation.mutate(school.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact Person */}
              {school.contactPerson && (
                <div>
                  <span className="text-sm font-medium text-gray-900">Contact Person:</span>
                  <p className="text-sm text-gray-600">{school.contactPerson}</p>
                </div>
              )}

              {/* Contact Information */}
              {school.contactEmail && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{school.contactEmail}</span>
                </div>
              )}
              
              {school.contactPhone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{school.contactPhone}</span>
                </div>
              )}

              {/* Address */}
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>{school.address}</p>
                  <p>{school.city}, {school.state} {school.pincode}</p>
                </div>
              </div>

              {/* Franchise Information */}
              {school.franchiseId && franchises.find((f: any) => f.id === school.franchiseId) && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Franchise: {franchises.find((f: any) => f.id === school.franchiseId)?.name}
                  </span>
                </div>
              )}

              {/* Agreement Status Details */}
              {school.agreementAcceptedAt && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  Agreement accepted on {new Date(school.agreementAcceptedAt).toLocaleDateString()}
                </div>
              )}

              {school.agreementStatus === 'pending' && (
                <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  Waiting for agreement acceptance
                </div>
              )}

              {/* Status Indicator */}
              <div className="flex justify-between items-center pt-2">
                <Badge variant={school.isActive ? "default" : "secondary"}>
                  {school.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-gray-500">
                  Created: {new Date(school.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schools.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schools registered</h3>
            <p className="text-gray-600 mb-4">
              Get started by registering your first school for dental camps.
            </p>
            {(user?.role === 'admin' || user?.role === 'franchisee') && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register First School
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
