import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Smile, School, Mail, Lock, MapPin, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth.tsx';
import { useToast } from '@/hooks/use-toast';

const schoolLoginSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  schoolCode: z.string().min(1, 'School code is required'),
  principalName: z.string().min(1, 'Principal name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
  establishedYear: z.string().min(4, 'Established year is required'),
  totalStudents: z.string().min(1, 'Total students is required'),
  grades: z.string().min(1, 'Grades offered is required'),
  boardAffiliation: z.string().min(1, 'Board affiliation is required'),
  facilities: z.string().min(1, 'School facilities are required'),
});

type SchoolLoginData = z.infer<typeof schoolLoginSchema>;

export function SchoolLogin() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SchoolLoginData>({
    resolver: zodResolver(schoolLoginSchema),
    defaultValues: {
      schoolName: 'St. Mary\'s Convent School',
      schoolCode: 'SMCS001',
      principalName: 'Dr. Priya Sharma',
      contactEmail: 'principal@stmarysschool.edu.in',
      contactPhone: '9876543210',
      address: '123 Education Street, Model Town',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      establishedYear: '1985',
      totalStudents: '1200',
      grades: 'Pre-KG to Class 12',
      boardAffiliation: 'CBSE (Central Board of Secondary Education)',
      facilities: 'Computer Lab, Science Labs, Library, Sports Ground, Auditorium, Medical Room, Cafeteria, Transportation',
    },
  });

  const onSubmit = async (data: SchoolLoginData) => {
    setIsLoading(true);
    try {
      // Simulate school login with dummy credentials
      await login('school@stmarysschool.edu.in', 'school123');
      toast({
        title: 'School Access Granted',
        description: `Welcome ${data.schoolName}! You have successfully logged in.`,
      });
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'Please check your school credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Smile className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Smile Stars India</h1>
          </div>
          <h2 className="text-xl text-gray-600">School Portal Access</h2>
          <p className="text-gray-500 mt-2">Enter your school details to access the dental care management system</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center">
              <School className="h-6 w-6 mr-2" />
              <div>
                <CardTitle>School Registration & Login</CardTitle>
                <CardDescription className="text-blue-100">
                  Complete school information for dental camp coordination
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic School Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <School className="h-4 w-4 mr-1" />
                          School Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter school name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schoolCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter school code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Principal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="principalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          Principal Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter principal name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="establishedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Established Year</FormLabel>
                        <FormControl>
                          <Input placeholder="Year established" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <Input type="email" placeholder="school@example.com" {...field} />
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
                </div>

                {/* Address Information */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        School Address
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter complete school address" {...field} />
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

                {/* School Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalStudents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Students</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter total students" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="grades"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grades Offered</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., KG to Class 12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="boardAffiliation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Affiliation</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CBSE, ICSE, State Board" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Facilities</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List available facilities (Lab, Library, Sports, etc.)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Access School Portal'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}