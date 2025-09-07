import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search, Filter, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreeningForm } from '@/components/ScreeningForm';
import { insertEntitySchema, type InsertEntity } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';
import { colorSchemes } from '@/lib/colorSchemes';

export function Students() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCamp, setSelectedCamp] = useState<string>('all');

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students', selectedCamp !== 'all' ? { campId: selectedCamp } : {}],
    queryFn: () => {
      const params = selectedCamp !== 'all' ? `?campId=${selectedCamp}` : '';
      return apiRequest(`/students${params}`);
    },
  });

  const { data: camps = [], isLoading: campsLoading } = useQuery({
    queryKey: ['/api/camps'],
    queryFn: () => apiRequest('/camps'),
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: () => apiRequest('/schools'),
  });

  const form = useForm<InsertStudent>({
    resolver: zodResolver(insertStudentSchema),
    defaultValues: {
      name: '',
      age: 0,
      gender: '',
      grade: '',
      rollNumber: '',
      schoolId: 0,
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      parentOccupation: '',
      campId: 0,
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: (studentData: InsertStudent) => apiRequest('/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: 'Success',
        description: 'Student registered successfully',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to register student',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: InsertStudent) => {
    createStudentMutation.mutate(data);
  };

  const startScreening = (student: any) => {
    setSelectedStudent(student);
    setShowScreeningForm(true);
  };

  const filteredStudents = students.filter((student: any) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (studentsLoading || campsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Students</h1>
          <p className="text-gray-600">
            Manage student registrations and dental screenings
          </p>
        </div>
        <div className="flex space-x-2">
          {(user?.role === 'admin' || user?.role === 'franchisee' || user?.role === 'school_admin') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className={colorSchemes.students.primary}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Register New Student</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Student Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Age"
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
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade/Class</FormLabel>
                            <FormControl>
                              <Input placeholder="Grade or class" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="rollNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Roll Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Roll number" {...field} />
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
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select school" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {schools.map((school: any) => (
                                  <SelectItem key={school.id} value={school.id.toString()}>
                                    {school.name}
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
                        name="campId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Camp</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select camp" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {camps.map((camp: any) => (
                                  <SelectItem key={camp.id} value={camp.id.toString()}>
                                    {camp.name} - {camp.school?.name}
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
                        name="parentName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parent/Guardian Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Parent name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parentPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parent Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parentEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parent Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parentOccupation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parent Occupation</FormLabel>
                            <FormControl>
                              <Input placeholder="Occupation" {...field} />
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
                      <Button type="submit" disabled={createStudentMutation.isPending}>
                        {createStudentMutation.isPending ? 'Registering...' : 'Register Student'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedCamp} onValueChange={setSelectedCamp}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by camp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map((camp: any) => (
              <SelectItem key={camp.id} value={camp.id.toString()}>
                {camp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{filteredStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Screened</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {filteredStudents.filter((s: any) => s.screeningCompleted).length}
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
                  <Users className="text-yellow-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {filteredStudents.filter((s: any) => !s.screeningCompleted).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Filter className="text-purple-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {filteredStudents.length > 0 
                    ? Math.round((filteredStudents.filter((s: any) => s.screeningCompleted).length / filteredStudents.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class/Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Screening Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            Roll: {student.rollNumber} • Age: {student.age} • {student.gender}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.grade}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.parentName}</div>
                      <div className="text-sm text-gray-500">{student.parentPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.screeningCompleted ? (
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      ) : student.hasScreening ? (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          In Progress
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(user?.role === 'dentist' || user?.role === 'admin') && !student.screeningCompleted && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => startScreening(student)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredStudents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCamp !== 'all' 
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by registering students for dental camps.'}
            </p>
            {(user?.role === 'admin' || user?.role === 'school_admin') && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register First Student
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Screening Form Modal */}
      {showScreeningForm && selectedStudent && (
        <ScreeningForm
          studentId={selectedStudent.id}
          campId={selectedStudent.campId}
          onClose={() => {
            setShowScreeningForm(false);
            setSelectedStudent(null);
          }}
          onComplete={() => {
            setShowScreeningForm(false);
            setSelectedStudent(null);
            queryClient.invalidateQueries({ queryKey: ['/api/students'] });
          }}
        />
      )}
    </div>
  );
}
