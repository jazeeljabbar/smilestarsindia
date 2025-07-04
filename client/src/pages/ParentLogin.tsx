import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Smile, Heart, Mail, Lock, MapPin, Phone, User, Users, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth.tsx';
import { useToast } from '@/hooks/use-toast';

const parentLoginSchema = z.object({
  // Parent Information
  parentName: z.string().min(1, 'Parent name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().min(10, 'Valid phone number is required'),
  alternatePhone: z.string().optional(),
  occupation: z.string().min(1, 'Occupation is required'),
  education: z.string().min(1, 'Education is required'),
  
  // Child Information
  childName: z.string().min(1, 'Child name is required'),
  childAge: z.string().min(1, 'Child age is required'),
  childGrade: z.string().min(1, 'Child grade is required'),
  childSchool: z.string().min(1, 'School name is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  bloodGroup: z.string().min(1, 'Blood group is required'),
  
  // Address Information
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
  
  // Medical Information
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
  emergencyContact: z.string().min(10, 'Emergency contact is required'),
  emergencyRelation: z.string().min(1, 'Emergency contact relation is required'),
  
  // Dental History
  previousDentalVisit: z.string().optional(),
  dentalProblems: z.string().optional(),
  oralHygienePractices: z.string().optional(),
});

type ParentLoginData = z.infer<typeof parentLoginSchema>;

export function ParentLogin() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ParentLoginData>({
    resolver: zodResolver(parentLoginSchema),
    defaultValues: {
      // Parent Information
      parentName: 'Mrs. Sunita Patel',
      relationship: 'Mother',
      contactEmail: 'sunita.patel@gmail.com',
      contactPhone: '9876543210',
      alternatePhone: '9123456789',
      occupation: 'Software Engineer',
      education: 'B.Tech Computer Science',
      
      // Child Information
      childName: 'Arjun Patel',
      childAge: '8',
      childGrade: 'Class 3',
      childSchool: 'St. Mary\'s Convent School',
      rollNumber: 'SM2024-301-015',
      dateOfBirth: '2016-05-15',
      bloodGroup: 'O+',
      
      // Address Information
      address: '45 Green Valley Apartments, Sector 7, Near City Mall',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      
      // Medical Information
      allergies: 'Mild allergy to peanuts and dust',
      medicalHistory: 'No major medical issues. Had chicken pox at age 5.',
      emergencyContact: '9987654321',
      emergencyRelation: 'Father (Rajesh Patel)',
      
      // Dental History
      previousDentalVisit: 'Last visit 6 months ago for routine checkup',
      dentalProblems: 'No major dental issues. Slight teeth alignment concern.',
      oralHygienePractices: 'Brushes twice daily, uses fluoride toothpaste, learning to floss',
    },
  });

  const onSubmit = async (data: ParentLoginData) => {
    setIsLoading(true);
    try {
      // Simulate parent login with dummy credentials
      await login('parent@example.com', 'parent123');
      toast({
        title: 'Parent Portal Access Granted',
        description: `Welcome ${data.parentName}! You can now view ${data.childName}'s dental reports.`,
      });
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Smile className="h-12 w-12 text-pink-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Smile Stars India</h1>
          </div>
          <h2 className="text-xl text-gray-600">Parent Portal Access</h2>
          <p className="text-gray-500 mt-2">Register to access your child's dental care reports and updates</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="bg-pink-600 text-white rounded-t-lg">
            <div className="flex items-center">
              <Heart className="h-6 w-6 mr-2" />
              <div>
                <CardTitle>Parent Registration & Portal Access</CardTitle>
                <CardDescription className="text-pink-100">
                  Complete registration to track your child's dental health journey
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Parent Information Section */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Parent Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="parentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter parent name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Guardian">Guardian</SelectItem>
                              <SelectItem value="Grandparent">Grandparent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            Contact Email
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="parent@example.com" {...field} />
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
                          <FormLabel className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            Contact Phone
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alternatePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternate Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Alternate contact (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter occupation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Education</FormLabel>
                        <FormControl>
                          <Input placeholder="Educational qualification" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Child Information Section */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <Baby className="h-5 w-5 mr-2" />
                    Child Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="childName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Child Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter child name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="childAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input placeholder="Child age" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="childGrade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade/Class</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Class 3" {...field} />
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
                            <Input placeholder="Student roll number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bloodGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blood Group</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select blood group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="childSchool"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter school name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address Information Section */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Address Information
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Complete Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter complete residential address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
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
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
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
                            <Input placeholder="Enter pincode" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Medical Information Section */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Medical & Emergency Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Emergency contact number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyRelation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Relation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Father, Uncle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl>
                          <Textarea placeholder="List any known allergies (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medicalHistory"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Medical History</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any significant medical history (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dental History Section */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                    <Smile className="h-5 w-5 mr-2" />
                    Dental History & Oral Care
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="previousDentalVisit"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Previous Dental Visits</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Details of previous dental visits (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dentalProblems"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Current Dental Concerns</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any current dental issues or concerns (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="oralHygienePractices"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oral Hygiene Practices</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Child's current oral care routine (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" disabled={isLoading}>
                  {isLoading ? 'Registering...' : 'Access Parent Portal'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}