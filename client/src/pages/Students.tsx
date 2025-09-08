import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search, Filter, Eye, FileText, X, UserPlus, Upload, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreeningForm } from '@/components/ScreeningForm';
import { insertEntitySchema, type InsertEntity } from '@shared/schema';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';
import { colorSchemes } from '@/lib/colorSchemes';

// Parent form schema
const parentSchema = z.object({
  name: z.string().min(1, 'Parent name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  occupation: z.string().optional(),
  relationship: z.enum(['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'], { required_error: 'Relationship is required' }),
  hasCustody: z.boolean().default(true),
  canPickup: z.boolean().default(true),
  emergencyContact: z.boolean().default(false),
  medicalDecisions: z.boolean().default(false),
});

// Student form schema with multiple parents
const studentFormSchema = z.object({
  name: z.string().min(1, 'Student name is required'),
  age: z.number().min(1, 'Age must be at least 1').max(18, 'Age must be less than 18'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { required_error: 'Gender is required' }),
  grade: z.string().min(1, 'Grade is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  schoolId: z.number().min(1, 'School selection is required'),
  parents: z.array(parentSchema).min(1, 'At least one parent is required').max(4, 'Maximum 4 parents allowed'),
});

type StudentFormData = z.infer<typeof studentFormSchema>;

export function Students() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCamp, setSelectedCamp] = useState<string>('all');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [uploadStep, setUploadStep] = useState<'select' | 'preview' | 'upload'>('select');

  // Helper functions for managing parents
  const addParent = () => {
    const currentParents = form.getValues().parents;
    if (currentParents.length < 4) {
      form.setValue('parents', [...currentParents, {
        name: '',
        email: '',
        phone: '',
        occupation: '',
        relationship: 'FATHER',
        hasCustody: true,
        canPickup: true,
        emergencyContact: false,
        medicalDecisions: false,
      }]);
    }
  };

  const removeParent = (index: number) => {
    const currentParents = form.getValues().parents;
    if (currentParents.length > 1) {
      form.setValue('parents', currentParents.filter((_, i) => i !== index));
    }
  };

  // Bulk upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadStep('preview');
      // Get preview
      previewUpload(file);
    }
  };

  const previewUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview', 'true');

    try {
      const response = await apiRequest('/students/bulk-upload', {
        method: 'POST',
        body: formData,
      });
      setUploadPreview(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to preview file',
        variant: 'destructive',
      });
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/students/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_upload_template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  const bulkUploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/students/bulk-upload', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: 'Success',
        description: data.message,
      });
      setShowBulkUpload(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadStep('select');
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.response?.data?.error || 'Failed to upload students',
        variant: 'destructive',
      });
    }
  });

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
    queryKey: ['/api/entities', 'SCHOOL'],
    queryFn: () => apiRequest('/entities?type=SCHOOL'),
  });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      age: 1,
      gender: 'MALE',
      grade: '',
      rollNumber: '',
      schoolId: 0,
      parents: [{
        name: '',
        email: '',
        phone: '',
        occupation: '',
        relationship: 'MOTHER',
        hasCustody: true,
        canPickup: true,
        emergencyContact: false,
        medicalDecisions: false,
      }],
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: (studentData: StudentFormData) => {
      // Send to new student registration endpoint that handles parents
      return apiRequest('/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
    },
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

  const onSubmit = (data: StudentFormData) => {
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
          {user?.roles?.some(role => ['SYSTEM_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN'].includes(role)) && (
            <>
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
            </>
          )}
          {user?.roles?.some(role => ['SYSTEM_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN'].includes(role)) && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className={colorSchemes.students.primary}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Register New Student</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2">
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
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
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
                      
                      {/* Parents Section */}
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Parent/Guardian Information</h3>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addParent}
                            disabled={form.getValues().parents.length >= 4}
                            className="flex items-center gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            Add Parent
                          </Button>
                        </div>

                        {form.watch('parents').map((parent, index) => (
                          <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Parent {index + 1}</h4>
                              {form.getValues().parents.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeParent(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name={`parents.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Full Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Parent full name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`parents.${index}.relationship`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Relationship *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select relationship" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="MOTHER">Mother</SelectItem>
                                        <SelectItem value="FATHER">Father</SelectItem>
                                        <SelectItem value="GUARDIAN">Guardian</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`parents.${index}.email`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email Address *</FormLabel>
                                    <FormControl>
                                      <Input type="email" placeholder="parent@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`parents.${index}.phone`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone Number *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="+91-9876543210" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`parents.${index}.occupation`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Occupation</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Occupation (optional)" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <Separator className="my-3" />
                            
                            {/* Custody and Permissions */}
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-gray-700">Permissions & Custody</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <FormField
                                  control={form.control}
                                  name={`parents.${index}.hasCustody`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox 
                                          checked={field.value} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm">Has Legal Custody</FormLabel>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`parents.${index}.canPickup`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox 
                                          checked={field.value} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm">Can Pick Up Student</FormLabel>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`parents.${index}.emergencyContact`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox 
                                          checked={field.value} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm">Emergency Contact</FormLabel>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`parents.${index}.medicalDecisions`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox 
                                          checked={field.value} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm">Medical Decisions</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4 mt-6 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createStudentMutation.isPending}>
                        {createStudentMutation.isPending ? 'Registering...' : 'Register Student'}
                      </Button>
                    </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Bulk Upload Dialog */}
          <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Bulk Upload Students</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                {uploadStep === 'select' && (
                  <div className="space-y-4">
                    <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Student Excel File</h3>
                      <p className="text-gray-500 mb-4">
                        Select an Excel file (.xlsx, .xls) containing student data
                      </p>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button className="cursor-pointer">
                          Choose File
                        </Button>
                      </label>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Download the template file first</li>
                        <li>• Fill in student and parent information</li>
                        <li>• School will be automatically set to your school</li>
                        <li>• Each student can have up to 2 parents</li>
                        <li>• Use TRUE/FALSE for permission fields</li>
                      </ul>
                    </div>
                  </div>
                )}

                {uploadStep === 'preview' && uploadPreview && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Preview Upload</h3>
                      <Badge variant="outline">
                        {uploadPreview.totalRecords} students found
                      </Badge>
                    </div>

                    {uploadPreview.totalErrors > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-800 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">{uploadPreview.totalErrors} errors found</span>
                        </div>
                        <div className="space-y-1 text-sm text-red-700">
                          {uploadPreview.errors.map((error: any, index: number) => (
                            <div key={index}>Row {error.row}: {error.error}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <h4 className="font-medium">First 10 Students Preview</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Age</th>
                              <th className="px-3 py-2 text-left">Gender</th>
                              <th className="px-3 py-2 text-left">Grade</th>
                              <th className="px-3 py-2 text-left">Roll No.</th>
                              <th className="px-3 py-2 text-left">Parents</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadPreview.preview.map((student: any, index: number) => (
                              <tr key={index} className="border-t">
                                <td className="px-3 py-2">{student.name}</td>
                                <td className="px-3 py-2">{student.age}</td>
                                <td className="px-3 py-2">{student.gender}</td>
                                <td className="px-3 py-2">{student.grade}</td>
                                <td className="px-3 py-2">{student.rollNumber}</td>
                                <td className="px-3 py-2">
                                  {student.parents.map((p: any, i: number) => (
                                    <div key={i} className="text-xs">
                                      {p.name} ({p.relationship})
                                    </div>
                                  ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 mt-6 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowBulkUpload(false);
                      setUploadStep('select');
                      setUploadFile(null);
                      setUploadPreview(null);
                    }}
                  >
                    Cancel
                  </Button>
                  {uploadStep === 'preview' && uploadPreview && uploadPreview.totalErrors === 0 && (
                    <Button 
                      onClick={() => uploadFile && bulkUploadMutation.mutate(uploadFile)}
                      disabled={bulkUploadMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {bulkUploadMutation.isPending ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Upload {uploadPreview.totalRecords} Students
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                      {user?.roles?.some(role => ['DENTIST', 'SYSTEM_ADMIN'].includes(role)) && !student.screeningCompleted && (
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
            {user?.roles?.some(role => ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'].includes(role)) && (
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
