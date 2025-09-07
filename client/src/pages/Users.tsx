import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, UserCog, Save, X, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { type User, type InsertUser } from '@shared/schema';

const userFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  roles: z.array(z.enum(['SYSTEM_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'DENTIST', 'PARENT'])).min(1, 'At least one role is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // Entity associations based on roles
  franchiseeId: z.number().optional(),
  schoolId: z.number().optional(),
  studentIds: z.array(z.number()).optional(),
  studentSearchQuery: z.string().optional(),
});

const editUserFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  roles: z.array(z.enum(['SYSTEM_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'DENTIST', 'PARENT'])).min(1, 'At least one role is required'),
  // Entity associations based on roles
  franchiseeId: z.number().optional(),
  schoolId: z.number().optional(),
  studentIds: z.array(z.number()).optional(),
  studentSearchQuery: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;
type EditUserFormData = z.infer<typeof editUserFormSchema>;

const roleColors = {
  SYSTEM_ADMIN: 'bg-red-100 text-red-800',
  ORG_ADMIN: 'bg-orange-100 text-orange-800',
  FRANCHISE_ADMIN: 'bg-purple-100 text-purple-800',
  PRINCIPAL: 'bg-blue-100 text-blue-800',
  SCHOOL_ADMIN: 'bg-cyan-100 text-cyan-800',
  TEACHER: 'bg-green-100 text-green-800',
  DENTIST: 'bg-emerald-100 text-emerald-800',
  PARENT: 'bg-gray-100 text-gray-800',
};

const statusColors = {
  INVITED: 'bg-blue-100 text-blue-800 border-blue-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
  ARCHIVED: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function Users() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedFranchisee, setSelectedFranchisee] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/users'),
  });

  // Fetch entities for dropdowns
  const { data: franchisees } = useQuery({
    queryKey: ['/api/franchisees'],
    queryFn: () => apiRequest('/franchisees'),
  });

  const { data: schools } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: () => apiRequest('/schools'),
    enabled: selectedRoles.some(role => ['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'].includes(role)),
  });

  const { data: students } = useQuery({
    queryKey: ['/api/students'],
    queryFn: () => apiRequest('/students'),
    enabled: selectedRoles.includes('PARENT'),
  });

  // Create user form
  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      email: '',
      name: '',
      roles: [],
      password: '',
      franchiseeId: undefined,
      schoolId: undefined,
      studentIds: [],
      studentSearchQuery: '',
    },
  });

  // Edit user form
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      username: '',
      email: '',
      name: '',
      roles: [],
      franchiseeId: undefined,
      schoolId: undefined,
      studentIds: [],
      studentSearchQuery: '',
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => 
      apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowCreateDialog(false);
      createForm.reset();
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditUserFormData }) =>
      apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      editForm.reset();
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User status updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    },
  });

  const onCreateSubmit = (data: UserFormData) => {
    // Transform data to include entity associations
    const userData = {
      username: data.username,
      email: data.email,
      name: data.name,
      password: data.password,
      roles: data.roles,
      entityAssociations: {
        franchiseeId: data.franchiseeId,
        schoolId: data.schoolId,
        studentIds: data.studentIds,
      }
    };
    createUserMutation.mutate(userData);
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (!editingUser) return;
    updateUserMutation.mutate({ id: editingUser.id, data });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      username: user.email, // Using email as username since User doesn't have username
      email: user.email,
      name: user.name,
      roles: (user as any).roles || ['PARENT'], // Type assertion for now
    });
  };

  const handleDelete = (id: number) => {
    deleteUserMutation.mutate(id);
    setUserToDelete(null);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const handleAddRole = (user: User) => {
    setSelectedUserForRole(user);
    setShowAddRoleDialog(true);
  };

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const getStatusBadge = (status: string) => {
    const statusClass = statusColors[status as keyof typeof statusColors] || statusColors.PENDING;
    return (
      <Badge className={statusClass}>
        {status}
      </Badge>
    );
  };

  // Pagination logic
  const paginatedUsers = useMemo(() => {
    if (!users) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return users.slice(startIndex, endIndex);
  }, [users, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!users) return 0;
    return Math.ceil(users.length / itemsPerPage);
  }, [users, itemsPerPage]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">
            Create, edit, and manage user accounts and their roles.
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with their role and credentials.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roles</FormLabel>
                      <Select 
                        value={field.value?.[0] || ""} 
                        onValueChange={(value) => {
                          const newRoles = [value];
                          field.onChange(newRoles);
                          setSelectedRoles(newRoles);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {['SYSTEM_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'DENTIST', 'PARENT'].map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional Entity Selection Fields */}
                {selectedRoles.includes('FRANCHISE_ADMIN') && (
                  <FormField
                    control={createForm.control}
                    name="franchiseeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Franchisee</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select franchisee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {franchisees?.map((franchisee: any) => (
                              <SelectItem key={franchisee.id} value={franchisee.id.toString()}>
                                {franchisee.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="create-new">+ Create New Franchisee</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedRoles.some(role => ['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'].includes(role)) && (
                  <FormField
                    control={createForm.control}
                    name="schoolId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select School</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {schools?.map((school: any) => (
                              <SelectItem key={school.id} value={school.id.toString()}>
                                {school.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="create-new">+ Create New School</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedRoles.includes('PARENT') && (
                  <FormField
                    control={createForm.control}
                    name="studentSearchQuery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Search for Student</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Type student name to search..." 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        {field.value && field.value.length > 2 && (
                          <div className="mt-2 border rounded-md p-2 bg-gray-50 max-h-40 overflow-y-auto">
                            {students?.filter((student: any) => 
                              student.name.toLowerCase().includes(field.value?.toLowerCase())
                            ).map((student: any) => (
                              <div 
                                key={student.id} 
                                className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                                onClick={() => {
                                  // Add student selection logic here
                                  toast({
                                    title: 'Student Selected',
                                    description: `Selected ${student.name}`,
                                  });
                                }}
                              >
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-gray-500">
                                  Grade: {student.metadata?.grade || 'Not specified'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage all user accounts and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-left py-3 px-4">Username</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers?.map((user: User) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {user.email}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(user as any).roles?.map((role: string) => (
                          <Badge key={role} className={roleColors[role as keyof typeof roleColors]}>
                            {role.replace('_', ' ')}
                          </Badge>
                        )) || <Badge className="bg-gray-100 text-gray-800">No roles</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                              disabled={user.status === 'ACTIVE'}
                            >
                              Set Active
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(user.id, 'PENDING')}
                              disabled={user.status === 'PENDING'}
                            >
                              Set Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                              disabled={user.status === 'SUSPENDED'}
                              className="text-red-600"
                            >
                              Suspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAddRole(user)}
                              className="text-blue-600"
                            >
                              <UserCog className="w-4 h-4 mr-2" />
                              Add Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {users && users.length > itemsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, users.length)} of {users.length} users
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and role.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Role</FormLabel>
                      <Select 
                        value={field.value?.[0] || ""} 
                        onValueChange={(value) => {
                          field.onChange([value]);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {['SYSTEM_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'DENTIST', 'PARENT'].map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Confirmation Dialog */}
      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {userToDelete.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(userToDelete.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Add Role Dialog */}
      {selectedUserForRole && (
        <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Role to {selectedUserForRole.name}</DialogTitle>
              <DialogDescription>
                Select additional roles for this user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Roles:</label>
                <div className="flex flex-wrap gap-1">
                  {((selectedUserForRole as any).roles || []).map((role: string) => (
                    <Badge key={role} className={roleColors[role as keyof typeof roleColors]}>
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Add New Role:</label>
                <Select onValueChange={(role) => {
                  // Here you would implement the add role logic
                  toast({
                    title: 'Feature Coming Soon',
                    description: 'Role management will be available in the next update.',
                  });
                  setShowAddRoleDialog(false);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {['SYSTEM_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'DENTIST', 'PARENT']
                      .filter(role => !((selectedUserForRole as any).roles || []).includes(role))
                      .map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}