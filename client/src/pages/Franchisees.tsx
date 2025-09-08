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

  // Filter franchises based on search term
  const filteredFranchises = useMemo(() => {
    if (!searchTerm.trim()) return franchises;
    
    const term = searchTerm.toLowerCase();
    return franchises.filter((franchise: any) =>
      franchise.name?.toLowerCase().includes(term) ||
      franchise.region?.toLowerCase().includes(term) ||
      franchise.contactPerson?.toLowerCase().includes(term) ||
      franchise.contactEmail?.toLowerCase().includes(term) ||
      franchise.city?.toLowerCase().includes(term) ||
      franchise.state?.toLowerCase().includes(term)
    );
  }, [franchises, searchTerm]);

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
      const response = await apiRequest(`/api/franchises/${franchiseId}`, {
        method: 'DELETE',
      });
      return response.json();
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
      
      const response = await apiRequest(`/api/franchises/${id}`, {
        method: 'PUT',
        body: JSON.stringify(entityData),
      });
      return response.json();
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

      {/* Statistics Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Franchisees</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-gray-500">{statistics.inactive}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Schools</p>
                  <p className="text-2xl font-bold text-purple-600">{statistics.totalSchools}</p>
                </div>
                <School className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search franchisees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Franchisees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFranchises.map((franchise: any) => (
          <Card key={franchise.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {franchise.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{franchise.region}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(franchise.agreementStatus)}
                  {getStatusBadge(franchise.agreementStatus)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
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
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
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
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact Person */}
              <div>
                <span className="text-sm font-medium text-gray-900">Contact Person:</span>
                <p className="text-sm text-gray-600">{franchise.contactPerson}</p>
              </div>

              {/* Contact Information */}
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{franchise.contactEmail}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{franchise.contactPhone}</span>
              </div>

              {/* Address */}
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>{franchise.address}</p>
                  <p>{franchise.city}, {franchise.state} {franchise.pincode}</p>
                </div>
              </div>

              {/* School Count */}
              <div className="flex items-center space-x-2">
                <School className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-600">
                  {franchise.schoolCount || 0} school{(franchise.schoolCount || 0) !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Agreement Status Details */}
              {franchise.agreementAcceptedAt && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  Agreement accepted on {new Date(franchise.agreementAcceptedAt).toLocaleDateString()}
                </div>
              )}

              {franchise.agreementStatus === 'pending' && (
                <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  Waiting for agreement acceptance
                </div>
              )}

              {/* Status Indicator */}
              <div className="flex justify-between items-center pt-2">
                <Badge variant={franchise.isActive ? "default" : "secondary"}>
                  {franchise.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-gray-500">
                  Created: {new Date(franchise.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFranchises.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No franchisees found' : 'No franchisees yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `No franchisees match "${searchTerm}". Try adjusting your search terms.`
                : 'Create your first franchisee to start expanding your dental care network.'
              }
            </p>
            {!searchTerm && (
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