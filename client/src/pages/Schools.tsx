import { useState, useEffect, useMemo } from 'react';
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
import { insertEntitySchema, type InsertEntity } from '@shared/schema';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';
import { colorSchemes } from '@/lib/colorSchemes';

// School form schema
const schoolFormSchema = z.object({
  name: z.string().min(1, 'School name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  contactPhone: z.string().min(10, 'Valid phone number is required'),
  contactEmail: z.string().email('Valid email is required'),
  registrationNumber: z.string().optional(),
  franchiseId: z.number().optional(),
  hasSubBranches: z.boolean().default(false),
  parentSchoolId: z.number().optional(),
  isActive: z.boolean().default(true),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

export function Schools() {
  const { user, token, activeMembership } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [franchiseeFilter, setFranchiseeFilter] = useState<number | null>(null);
  const [hasSubBranchesFilter, setHasSubBranchesFilter] = useState<string>('all');

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
    queryKey: ['/api/schools', activeMembership?.entityId],
    queryFn: () => {
      const entityParam = activeMembership?.entityId ? `?entityId=${activeMembership.entityId}` : '';
      return apiRequest(`/schools${entityParam}`);
    },
  });

  // Fetch franchisees for selection
  const { data: franchisees = [] } = useQuery({
    queryKey: ['/api/entities', 'FRANCHISEE'],
    queryFn: () => apiRequest('/entities?type=FRANCHISEE'),
    enabled: user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'].includes(role)),
  });

  // Check if there are active franchisees
  const activeFranchisees = franchisees.filter((f: any) => f.status === 'ACTIVE');
  const hasActiveFranchisees = activeFranchisees.length > 0;

  // Filter schools based on search term and filters
  const filteredSchools = useMemo(() => {
    let filtered = schools;

    // Apply franchisee filter
    if (franchiseeFilter) {
      filtered = filtered.filter((school: any) => school.franchiseId === franchiseeFilter || school.parentId === franchiseeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter((school: any) => school.isActive === isActive || school.status === (isActive ? 'ACTIVE' : 'INACTIVE'));
    }

    // Apply has sub-branches filter
    if (hasSubBranchesFilter !== 'all') {
      const hasSubs = hasSubBranchesFilter === 'yes';
      filtered = filtered.filter((school: any) => (school.hasSubBranches || school.metadata?.hasSubBranches) === hasSubs);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((school: any) =>
        school.name?.toLowerCase().includes(term) ||
        school.city?.toLowerCase().includes(term) ||
        school.state?.toLowerCase().includes(term) ||
        school.contactPerson?.toLowerCase().includes(term) ||
        school.metadata?.contactPerson?.toLowerCase().includes(term) ||
        school.metadata?.principalName?.toLowerCase().includes(term) ||
        school.registrationNumber?.toLowerCase().includes(term) ||
        school.metadata?.registrationNumber?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [schools, searchTerm, statusFilter, franchiseeFilter, hasSubBranchesFilter]);

  // Paginate filtered results
  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSchools.slice(startIndex, endIndex);
  }, [filteredSchools, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredSchools.length / pageSize);
  }, [filteredSchools.length, pageSize]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = schools.length;
    const active = schools.filter((s: any) => s.isActive || s.status === 'ACTIVE').length;
    const withSubBranches = schools.filter((s: any) => s.hasSubBranches || s.metadata?.hasSubBranches).length;
    // Note: totalStudents would need to be fetched from backend or calculated if available
    const totalStudents = 0; // Placeholder

    return { total, active, withSubBranches, totalStudents };
  }, [schools]);

  // Parent schools are the same as schools for sub-branch selection
  const parentSchools = schools;

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
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
      franchiseId: user?.roles?.includes('FRANCHISE_ADMIN') ?
        user?.memberships?.find((m: any) => m.role === 'FRANCHISE_ADMIN')?.entityId : undefined,
      hasSubBranches: false,
      parentSchoolId: undefined,
      isActive: true,
    },
  });

  // Reset form when editing school changes or user data loads
  useEffect(() => {
    if (editingSchool) {
      form.reset({
        name: editingSchool.name || '',
        address: editingSchool.address || editingSchool.metadata?.address || '',
        city: editingSchool.city || editingSchool.metadata?.city || '',
        state: editingSchool.state || editingSchool.metadata?.state || '',
        pincode: editingSchool.pincode || editingSchool.metadata?.pincode || '',
        contactPerson: editingSchool.contactPerson || editingSchool.metadata?.contactPerson || editingSchool.metadata?.principalName || '',
        contactPhone: editingSchool.contactPhone || editingSchool.metadata?.contactPhone || editingSchool.metadata?.schoolContactPhone || '',
        contactEmail: editingSchool.contactEmail || editingSchool.metadata?.contactEmail || editingSchool.metadata?.principalEmail || editingSchool.metadata?.schoolContactEmail || '',
        registrationNumber: editingSchool.registrationNumber || editingSchool.metadata?.registrationNumber || '',
        franchiseId: editingSchool.franchiseId || editingSchool.parentId || undefined,
        hasSubBranches: editingSchool.hasSubBranches || editingSchool.metadata?.hasSubBranches || false,
        parentSchoolId: editingSchool.parentSchoolId || editingSchool.metadata?.parentSchoolId || undefined,
        isActive: editingSchool.status === 'ACTIVE',
      });
    } else {
      // Get franchisee ID for franchise admin users
      let defaultFranchiseId = undefined;
      if (user?.roles?.includes('FRANCHISE_ADMIN')) {
        const franchiseeMembership = user?.memberships?.find((m: any) => m.role === 'FRANCHISE_ADMIN');
        defaultFranchiseId = franchiseeMembership?.entityId || activeMembership?.entityId;
      }

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
        franchiseId: defaultFranchiseId,
        hasSubBranches: false,
        parentSchoolId: undefined,
        isActive: true,
      });
    }
  }, [editingSchool, form, user?.roles, user?.memberships, activeMembership]);

  const createSchoolMutation = useMutation({
    mutationFn: (schoolData: SchoolFormData) => {
      if (editingSchool) {
        // Update existing school - only send changed fields
        const updateData = {
          name: schoolData.name,
          status: schoolData.isActive ? 'ACTIVE' : 'INACTIVE',
          metadata: {
            ...editingSchool.metadata,
            address: schoolData.address,
            city: schoolData.city,
            state: schoolData.state,
            pincode: schoolData.pincode,
            contactPerson: schoolData.contactPerson,
            contactPhone: schoolData.contactPhone,
            contactEmail: schoolData.contactEmail,
            principalName: schoolData.contactPerson,
            principalEmail: schoolData.contactEmail,
            schoolContactPerson: schoolData.contactPerson,
            schoolContactPhone: schoolData.contactPhone,
            schoolContactEmail: schoolData.contactEmail,
            registrationNumber: schoolData.registrationNumber,
            hasSubBranches: schoolData.hasSubBranches,
            parentSchoolId: schoolData.parentSchoolId,
          }
        };

        return apiRequest(`/schools/${editingSchool.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
      } else {
        // Create new school using dedicated schools endpoint
        const schoolData_payload = {
          name: schoolData.name,
          type: 'SCHOOL',
          status: schoolData.isActive ? 'ACTIVE' : 'INACTIVE',
          parentId: schoolData.franchiseId,
          metadata: {
            address: schoolData.address,
            city: schoolData.city,
            state: schoolData.state,
            pincode: schoolData.pincode,
            principalName: schoolData.contactPerson,
            principalEmail: schoolData.contactEmail,
            schoolContactPerson: schoolData.contactPerson,
            schoolContactPhone: schoolData.contactPhone,
            schoolContactEmail: schoolData.contactEmail,
            registrationNumber: schoolData.registrationNumber,
            hasSubBranches: schoolData.hasSubBranches,
            parentSchoolId: schoolData.parentSchoolId,
          }
        };

        console.log('Sending school creation payload:', schoolData_payload);

        if (!schoolData_payload.parentId) {
          throw new Error('Franchisee ID (parentId) is required but missing');
        }

        return apiRequest('/schools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schoolData_payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools/list'] });
      toast({
        title: 'Success',
        description: editingSchool ? 'School updated successfully' : 'School registered successfully',
      });
      setIsDialogOpen(false);
      setEditingSchool(null);
      form.reset();
    },
    onError: (error: any) => {
      console.error('School mutation error:', error);
      toast({
        title: 'Error',
        description: error?.message || (editingSchool ? 'Failed to update school' : 'Failed to register school'),
        variant: 'destructive',
      });
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: (schoolId: number) => {
      return apiRequest(`/schools/${schoolId}`, {
        method: 'DELETE',
      });
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

  const onSubmit = (data: SchoolFormData) => {
    // For franchise admins, always ensure franchiseId is set from their membership
    let franchiseId = data.franchiseId;

    if (user?.roles?.includes('FRANCHISE_ADMIN')) {
      if (!franchiseId) {
        // Try different ways to get the franchise ID
        const franchiseeMembership = user?.memberships?.find((m: any) => m.role === 'FRANCHISE_ADMIN');

        if (franchiseeMembership?.entityId) {
          franchiseId = franchiseeMembership.entityId;
        } else if (activeMembership?.entityId && activeMembership?.role === 'FRANCHISE_ADMIN') {
          franchiseId = activeMembership.entityId;
        }
      }

      if (!franchiseId) {
        toast({
          title: 'Error',
          description: 'Unable to determine your franchisee. Please contact support.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!franchiseId) {
      toast({
        title: 'Error',
        description: 'Franchisee must be selected',
        variant: 'destructive',
      });
      return;
    }

    // Update the form data with the correct franchise ID
    const updatedData = { ...data, franchiseId };
    createSchoolMutation.mutate(updatedData);
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
        {user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'].includes(role)) && (
          <div className="flex items-center space-x-2">
            {user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN'].includes(role)) && !hasActiveFranchisees && (
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
                  className={hasActiveFranchisees
                    ? colorSchemes.schools.primary
                    : "bg-gray-400 cursor-not-allowed"
                  }
                  disabled={!hasActiveFranchisees}
                  title={!hasActiveFranchisees ? "Create and approve a franchisee first" : ""}
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
                    {user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN'].includes(role)) && (
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
                                    {franchisees.map((franchise: any) => (
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

      {/* Advanced Filters */}
      {user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'].includes(role)) && (
        <div className="bg-gray-50 p-4 rounded-lg border mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & View Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Franchisee Filter - System/Org Admins only */}
            {user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN'].includes(role)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Franchisee</label>
                <select
                  value={franchiseeFilter || '0'}
                  onChange={(e) => {
                    const franchiseeId = e.target.value && e.target.value !== '0' ? parseInt(e.target.value) : null;
                    setFranchiseeFilter(franchiseeId);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="0">All Franchisees</option>
                  {franchisees.map((franchisee: any) => (
                    <option key={franchisee.id} value={franchisee.id.toString()}>
                      {franchisee.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="all">All Schools</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Has Sub-branches Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-branches</label>
              <select
                value={hasSubBranchesFilter}
                onChange={(e) => {
                  setHasSubBranchesFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="all">All</option>
                <option value="yes">With Sub-branches</option>
                <option value="no">Without Sub-branches</option>
              </select>
            </div>

            {/* Page Size Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Results per page</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>

          {/* Clear Filters & Results Summary */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setFranchiseeFilter(null);
                setStatusFilter('all');
                setHasSubBranchesFilter('all');
                setCurrentPage(1);
              }}
              size="sm">
              Clear All Filters
            </Button>

            {/* Results Summary */}
            <div className="text-sm text-gray-600">
              Showing {filteredSchools.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} - {Math.min(currentPage * pageSize, filteredSchools.length)} of {filteredSchools.length} schools
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, city, contact person, registration number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="text-blue-600 h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Schools</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-green-600 h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Schools</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="text-purple-600 h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">With Sub-branches</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.withSubBranches}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="text-orange-600 h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schools List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchisee
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
                {paginatedSchools.map((school: any) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
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
                          </div>
                          <div className="text-sm text-gray-500">
                            {school.registrationNumber && `Reg: ${school.registrationNumber} • `}
                            {school.city}, {school.state}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{school.contactPerson}</div>
                      <div className="text-sm text-gray-500">{school.contactPhone}</div>
                      <div className="text-sm text-gray-500">{school.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {school.franchiseId && franchisees.find((f: any) => f.id === school.franchiseId)?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={school.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {school.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'].includes(role)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
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
                                    className="bg-red-600 hover:bg-red-700">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border rounded-lg">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Showing {filteredSchools.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredSchools.length)} of {filteredSchools.length} schools
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}>
              First
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}>
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0">
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}>
              Next
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}>
              Last
            </Button>
          </div>
        </div>
      )}

      {filteredSchools.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || franchiseeFilter || hasSubBranchesFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by registering your first school for dental camps.'}
            </p>
            {!searchTerm && statusFilter === 'all' && !franchiseeFilter && hasSubBranchesFilter === 'all' && user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN'].includes(role)) && (
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
