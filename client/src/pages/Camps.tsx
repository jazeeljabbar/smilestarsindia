import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Users, Eye, Edit, Trash2, UserPlus, UserMinus, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [showEnrollmentView, setShowEnrollmentView] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [franchiseeFilter, setFranchiseeFilter] = useState<number | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<number | null>(null);

  // Simple form state - no complex validation
  const [formData, setFormData] = useState({
    name: '',
    franchiseeId: '',
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

  // Franchisees data for admin users
  const { data: franchisees = [] } = useQuery({
    queryKey: ['/api/franchisees/list'],
    queryFn: () => apiRequest('/franchisees/list'),
    enabled: activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN' || activeRole === 'FRANCHISE_ADMIN',
  });

  // Role-based schools data
  const { data: availableSchools = [] } = useQuery({
    queryKey: ['/api/schools/list', formData.franchiseeId, activeRole],
    queryFn: () => {
      // For franchise admins, don't need franchiseeId param as backend filters by their membership
      // For system/org admins, use franchiseeId if selected
      const params = (activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN') && formData.franchiseeId
        ? `?franchiseeId=${formData.franchiseeId}`
        : '';
      return apiRequest(`/schools/list${params}`);
    },
    enabled: activeRole !== 'SCHOOL_ADMIN',
  });

  // Filter camps based on search term and filters
  const filteredCamps = useMemo(() => {
    let filtered = camps;

    // Apply franchisee filter
    if (franchiseeFilter) {
      filtered = filtered.filter((camp: any) => camp.franchiseeId === franchiseeFilter);
    }

    // Apply school filter
    if (schoolFilter) {
      filtered = filtered.filter((camp: any) => camp.schoolId === schoolFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((camp: any) => camp.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((camp: any) =>
        camp.name?.toLowerCase().includes(term) ||
        camp.schoolName?.toLowerCase().includes(term) ||
        camp.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [camps, searchTerm, statusFilter, franchiseeFilter, schoolFilter]);

  // Paginate filtered results
  const paginatedCamps = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCamps.slice(startIndex, endIndex);
  }, [filteredCamps, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredCamps.length / pageSize);
  }, [filteredCamps.length, pageSize]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = camps.length;
    const planned = camps.filter((c: any) => c.status === 'PLANNED' || c.status === 'planned').length;
    const active = camps.filter((c: any) => c.status === 'ACTIVE' || c.status === 'active').length;
    const completed = camps.filter((c: any) => c.status === 'COMPLETED' || c.status === 'completed').length;

    return { total, planned, active, completed };
  }, [camps]);

  // Enrollment management queries
  const { data: enrolledStudents = [], isLoading: enrolledLoading } = useQuery({
    queryKey: ['/api/camps', selectedCamp?.id, 'enrollments'],
    queryFn: () => apiRequest(`/camps/${selectedCamp.id}/enrollments`),
    enabled: !!(selectedCamp?.id && showEnrollmentView),
  });

  const { data: availableStudents = [], isLoading: availableLoading } = useQuery({
    queryKey: ['/api/camps', selectedCamp?.id, 'available-students'],
    queryFn: () => apiRequest(`/camps/${selectedCamp.id}/available-students`),
    enabled: !!(selectedCamp?.id && showEnrollmentView),
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

  // Enrollment mutations
  const enrollStudentsMutation = useMutation({
    mutationFn: ({ campId, studentIds }: { campId: number; studentIds: number[] }) => {
      return apiRequest(`/camps/${campId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/camps', selectedCamp?.id, 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', selectedCamp?.id, 'available-students'] });
      toast({
        title: 'Success',
        description: data.message || 'Students enrolled successfully',
      });
      setSelectedStudents([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll students',
        variant: 'destructive',
      });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: ({ campId, studentId }: { campId: number; studentId: number }) => {
      return apiRequest(`/camps/${campId}/enrollments/${studentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/camps', selectedCamp?.id, 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', selectedCamp?.id, 'available-students'] });
      toast({
        title: 'Success',
        description: 'Student removed from camp successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove student',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      franchiseeId: '',
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

    // For system/org admin users, validate franchisee selection
    if ((activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN') && !formData.franchiseeId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a franchisee',
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

    // For admin/franchisee roles, check available schools
    if (activeRole !== 'SCHOOL_ADMIN') {
      const validSchools = availableSchools.filter((school: any) => school.status === 'ACTIVE' || school.status === 'DRAFT');
      if (validSchools.length === 0) {
        toast({
          title: 'No Schools Available',
          description: 'No schools found for camp scheduling',
          variant: 'destructive',
        });
        return;
      }
    }

    // Prepare data for API
    const campData = {
      name: formData.name,
      schoolEntityId: parseInt(schoolId),
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      expectedStudents: parseInt(formData.expectedStudents),
      status: formData.status,
      description: formData.description,
      assignedDentistId: null,
      createdBy: user?.id || 0,
    };

    createCampMutation.mutate(campData);
  };

  // Enrollment management handlers
  const openEnrollmentView = (camp: any) => {
    setSelectedCamp(camp);
    setShowEnrollmentView(true);
    setSelectedStudents([]);
  };

  const closeEnrollmentView = () => {
    setSelectedCamp(null);
    setShowEnrollmentView(false);
    setSelectedStudents([]);
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const enrollSelectedStudents = () => {
    if (selectedStudents.length === 0 || !selectedCamp) return;
    enrollStudentsMutation.mutate({
      campId: selectedCamp.id,
      studentIds: selectedStudents
    });
  };

  const removeStudent = (studentId: number) => {
    if (!selectedCamp) return;
    removeStudentMutation.mutate({
      campId: selectedCamp.id,
      studentId
    });
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

  // Render enrollment management view
  if (showEnrollmentView && selectedCamp) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={closeEnrollmentView}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Camps</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedCamp.name}</h1>
              <p className="text-gray-600">Manage student enrollment for this camp</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enrolled Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Enrolled Students ({enrolledStudents.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrolledLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : enrolledStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No students enrolled yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {enrolledStudents.map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">
                          Grade {student.grade} • Roll: {student.rollNumber}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStudent(student.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={removeStudentMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  <span>Available Students ({availableStudents.length})</span>
                </div>
                {selectedStudents.length > 0 && (
                  <Button
                    onClick={enrollSelectedStudents}
                    disabled={enrollStudentsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Enroll {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">All students from this school are enrolled</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableStudents.map((student: any) => (
                    <div key={student.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => toggleStudentSelection(student.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">
                          Grade {student.grade} • Roll: {student.rollNumber} • Age: {student.age}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
        {(activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN' || activeRole === 'FRANCHISE_ADMIN') && (
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

                  {/* Franchisee selection - only for System/Org Admins */}
                  {(activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN') && (
                    <div className="space-y-2">
                      <Label htmlFor="franchiseeId">Franchisee</Label>
                      <Select
                        value={formData.franchiseeId}
                        onValueChange={(value) => {
                          setFormData({ ...formData, franchiseeId: value, schoolId: '' }); // Reset school when franchisee changes
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select franchisee" />
                        </SelectTrigger>
                        <SelectContent>
                          {franchisees.map((franchisee: any) => (
                            <SelectItem key={franchisee.id} value={franchisee.id.toString()}>
                              {franchisee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* School selection - show for admin and franchisee roles */}
                  {activeRole !== 'SCHOOL_ADMIN' && (
                    <div className="space-y-2">
                      <Label htmlFor="schoolId">School</Label>
                      <Select
                        value={formData.schoolId}
                        onValueChange={(value) => setFormData({ ...formData, schoolId: value })}
                        disabled={
                          (activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN') && !formData.franchiseeId
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              (activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN') && !formData.franchiseeId
                                ? "Select franchisee first"
                                : "Select school"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSchools
                            .filter((school: any) => school.status === 'ACTIVE' || school.status === 'DRAFT')
                            .map((school: any) => (
                              <SelectItem key={school.id} value={school.id.toString()}>
                                {school.name} {school.city && school.state ? `- ${school.city}, ${school.state}` : ''}
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

      {/* Advanced Filters */}
      {(activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN' || activeRole === 'FRANCHISE_ADMIN') && (
        <div className="bg-gray-50 p-4 rounded-lg border mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & View Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Franchisee Filter - System/Org Admins only */}
            {(activeRole === 'SYSTEM_ADMIN' || activeRole === 'ORG_ADMIN') && (
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

            {/* School Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
              <select
                value={schoolFilter || '0'}
                onChange={(e) => {
                  const schoolId = e.target.value && e.target.value !== '0' ? parseInt(e.target.value) : null;
                  setSchoolFilter(schoolId);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="0">All Schools</option>
                {schools.map((school: any) => (
                  <option key={school.id} value={school.id.toString()}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

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
                <option value="all">All Camps</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
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
                setSchoolFilter(null);
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              size="sm">
              Clear All Filters
            </Button>

            {/* Results Summary */}
            <div className="text-sm text-gray-600">
              Showing {filteredCamps.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} - {Math.min(currentPage * pageSize, filteredCamps.length)} of {filteredCamps.length} camps
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by camp name, school name, description..."
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
                {paginatedCamps.map((camp: any) => (
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
                        {camp.enrolledCount || 0} / {camp.expectedStudents}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge {...getStatusBadge(camp.status)}>
                        {camp.status.charAt(0).toUpperCase() + camp.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEnrollmentView(camp)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Manage Students"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border rounded-lg">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Showing {filteredCamps.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredCamps.length)} of {filteredCamps.length} camps
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

      {filteredCamps.length === 0 && !campsLoading && (
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
