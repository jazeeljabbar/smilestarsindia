import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Mail, Phone, MapPin, Building2, Users, CheckCircle, Clock, AlertCircle, Trash2, MoreVertical, Search, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertEntitySchema, type InsertEntity } from '@shared/schema';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';
import { colorSchemes } from '@/lib/colorSchemes';

export function Franchisees() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Only system admins can access this page
  if (!user?.roles?.includes('SYSTEM_ADMIN')) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only system administrators can manage franchisees.</p>
        </div>
      </div>
    );
  }

  const { data: franchises = [], isLoading } = useQuery({
    queryKey: ['/api/franchises'],
    queryFn: async () => {
      const response = await fetch('/api/franchises', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch franchises');
      return response.json();
    },
  });

  // Filter franchises based on search term and status
  const filteredFranchises = useMemo(() => {
    let filtered = franchises;

    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter((franchise: any) => franchise.isActive === isActive);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((franchise: any) =>
        franchise.name?.toLowerCase().includes(term) ||
        franchise.region?.toLowerCase().includes(term) ||
        franchise.contactPerson?.toLowerCase().includes(term) ||
        franchise.contactEmail?.toLowerCase().includes(term) ||
        franchise.city?.toLowerCase().includes(term) ||
        franchise.state?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [franchises, searchTerm, statusFilter]);

  // Paginate filtered results
  const paginatedFranchises = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredFranchises.slice(startIndex, endIndex);
  }, [filteredFranchises, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredFranchises.length / pageSize);
  }, [filteredFranchises.length, pageSize]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = franchises.length;
    const active = franchises.filter((f: any) => f.isActive).length;
    const inactive = total - active;
    const totalSchools = franchises.reduce((sum: number, f: any) => sum + (f.schoolCount || 0), 0);

    return { total, active, inactive, totalSchools };
  }, [franchises]);

  const franchiseFormSchema = z.object({
    name: z.string().min(1, 'Franchise name is required'),
    region: z.string().min(1, 'Region is required'),
    franchiseContactPerson: z.string().min(1, 'Contact person is required'),
    franchiseContactEmail: z.string().email('Invalid email address'),
    franchiseContactPhone: z.string().min(1, 'Contact phone is required'),
    franchiseAddress: z.string().min(1, 'Address is required'),
    franchiseCity: z.string().min(1, 'City is required'),
    franchiseState: z.string().min(1, 'State is required'),
    franchisePincode: z.string().min(1, 'Pincode is required'),
  });

  type FranchiseFormData = z.infer<typeof franchiseFormSchema>;

  const form = useForm<FranchiseFormData>({
    resolver: zodResolver(franchiseFormSchema),
    defaultValues: {
      name: '',
      region: '',
      franchiseContactPerson: '',
      franchiseContactEmail: '',
      franchiseContactPhone: '',
      franchiseAddress: '',
      franchiseCity: '',
      franchiseState: '',
      franchisePincode: '',
    },
  });

  const createFranchiseMutation = useMutation({
    mutationFn: async (data: FranchiseFormData) => {
      // Transform the form data to entity format
      const entityData = {
        type: 'FRANCHISEE',
        name: data.name,
        status: 'ACTIVE',
        parentId: 1, // Assume parent is Smile Stars India organization
        metadata: {
          region: data.region,
          franchiseContactPerson: data.franchiseContactPerson,
          franchiseContactEmail: data.franchiseContactEmail,
          franchiseContactPhone: data.franchiseContactPhone,
          franchiseAddress: data.franchiseAddress,
          franchiseCity: data.franchiseCity,
          franchiseState: data.franchiseState,
          franchisePincode: data.franchisePincode,
        }
      };

      const response = await fetch('/api/franchises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(entityData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create franchise');
      }
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchises'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] }); // Refresh schools too
      setIsDialogOpen(false);
      setEditingFranchise(null);
      form.reset();
      toast({
        title: 'Success',
        description: response.message || (editingFranchise ? 'Franchise updated successfully' : 'Franchise created successfully'),
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

  const deleteFranchiseMutation = useMutation({
    mutationFn: async (franchiseId: number) => {
      const response = await apiRequest(`/franchises/${franchiseId}`, {
        method: 'DELETE',
      });
      return response; // apiRequest already returns parsed JSON
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchises'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      toast({
        title: 'Success',
        description: 'Franchise deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cannot Delete Franchise',
        description: error.message,
        variant: 'destructive',
        duration: 6000, // Show longer for dependency messages
      });
    },
  });

  const updateFranchiseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FranchiseFormData }) => {
      // Transform the form data to entity format
      const entityData = {
        type: 'FRANCHISEE',
        name: data.name,
        status: 'ACTIVE',
        parentId: 1,
        metadata: {
          region: data.region,
          franchiseContactPerson: data.franchiseContactPerson,
          franchiseContactEmail: data.franchiseContactEmail,
          franchiseContactPhone: data.franchiseContactPhone,
          franchiseAddress: data.franchiseAddress,
          franchiseCity: data.franchiseCity,
          franchiseState: data.franchiseState,
          franchisePincode: data.franchisePincode,
        }
      };

      const response = await apiRequest(`/franchises/${id}`, {
        method: 'PUT',
        body: JSON.stringify(entityData),
      });
      return response; // apiRequest already returns parsed JSON
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchises'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      setIsDialogOpen(false);
      setEditingFranchise(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Franchise updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update franchise',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FranchiseFormData) => {
    if (editingFranchise) {
      updateFranchiseMutation.mutate({ id: editingFranchise.id, data });
    } else {
      createFranchiseMutation.mutate(data);
    }
  };

  // Set form values when editing
  useEffect(() => {
    if (editingFranchise) {
      form.reset({
        name: editingFranchise.name || '',
        region: editingFranchise.metadata?.region || '',
        franchiseContactPerson: editingFranchise.metadata?.franchiseContactPerson || '',
        franchiseContactEmail: editingFranchise.metadata?.franchiseContactEmail || '',
        franchiseContactPhone: editingFranchise.metadata?.franchiseContactPhone || '',
        franchiseAddress: editingFranchise.metadata?.franchiseAddress || '',
        franchiseCity: editingFranchise.metadata?.franchiseCity || '',
        franchiseState: editingFranchise.metadata?.franchiseState || '',
        franchisePincode: editingFranchise.metadata?.franchisePincode || '',
      });
    } else {
      form.reset({
        name: '',
        region: '',
        franchiseContactPerson: '',
        franchiseContactEmail: '',
        franchiseContactPhone: '',
        franchiseAddress: '',
        franchiseCity: '',
        franchiseState: '',
        franchisePincode: '',
      });
    }
  }, [editingFranchise, form]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Franchisees</h1>
          <p className="text-gray-600">
            Manage franchise partners and their regional operations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingFranchise(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className={colorSchemes.franchisees.primary}>
              <Plus className="h-4 w-4 mr-2" />
              Create Franchisee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFranchise ? 'Edit Franchise' : 'Create New Franchisee'}</DialogTitle>
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
                          <FormLabel>Franchise Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter franchise name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="franchiseContactPerson"
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
                      control={form.control}
                      name="franchiseContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="franchiseContactPhone"
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
                  <FormField
                    control={form.control}
                    name="franchiseAddress"
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
                      control={form.control}
                      name="franchiseCity"
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
                      name="franchiseState"
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
                      name="franchisePincode"
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
                  <Button type="submit" disabled={createFranchiseMutation.isPending || updateFranchiseMutation.isPending}>
                    {(createFranchiseMutation.isPending || updateFranchiseMutation.isPending)
                      ? (editingFranchise ? 'Updating...' : 'Creating...')
                      : (editingFranchise ? 'Update Franchise' : 'Create Franchisee')
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Advanced Filters - System/Org Admins only */}
      {user?.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN'].includes(role)) && (
        <div className="bg-gray-50 p-4 rounded-lg border mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & View Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <option value="all">All Franchisees</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
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
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              size="sm">
              Clear All Filters
            </Button>

            {/* Results Summary */}
            <div className="text-sm text-gray-600">
              Showing {filteredFranchises.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} - {Math.min(currentPage * pageSize, filteredFranchises.length)} of {filteredFranchises.length} franchisees
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, region, contact person..."
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
                    <Building2 className="text-blue-600 h-6 w-6" />
                  </div >
                </div >
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Franchisees</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.total}</p>
                </div >
              </div >
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-green-600 h-6 w-6" />
                  </div >
                </div >
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.active}</p>
                </div >
              </div >
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-gray-600 h-6 w-6" />
                  </div >
                </div >
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Inactive</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.inactive}</p>
                </div >
              </div >
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <School className="text-purple-600 h-6 w-6" />
                  </div >
                </div >
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Schools</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.totalSchools}</p>
                </div >
              </div >
            </CardContent>
          </Card>
        </div >
      )}

      {/* Franchisees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Franchisees List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchisee Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schools
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
                {paginatedFranchises.map((franchise: any) => (
                  <tr key={franchise.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{franchise.name}</div>
                          <div className="text-sm text-gray-500">
                            {franchise.region} • {franchise.city}, {franchise.state}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{franchise.contactPerson}</div>
                      <div className="text-sm text-gray-500">{franchise.contactPhone}</div>
                      <div className="text-sm text-gray-500">{franchise.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <School className="h-4 w-4 text-purple-600 mr-1" />
                        {franchise.schoolCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={franchise.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {franchise.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingFranchise(franchise);
                            setIsDialogOpen(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Franchise
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Franchise
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the franchise
                                  "{franchise.name}" and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteFranchiseMutation.mutate(franchise.id)}
                                  className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              Showing {filteredFranchises.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredFranchises.length)} of {filteredFranchises.length} franchisees
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

      {filteredFranchises.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No franchisees found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first franchisee.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Franchisee
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {franchises.length === 0 && isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No franchisees yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first franchisee to start expanding your dental care network.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Franchisee
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}