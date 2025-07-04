import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'wouter';
import { Smile, School, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/lib/auth.tsx';
import { useToast } from '@/hooks/use-toast';
import { loginSchema, type LoginData } from '@shared/schema';

export function SchoolLogin() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'school@stmarysschool.edu.in',
      password: 'password',
    },
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: 'Welcome to School Portal',
        description: 'You have successfully logged in as a school administrator.',
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
          <p className="text-gray-500 mt-2">Sign in to access your school's dental care management system</p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg">
              <div className="flex items-center">
                <School className="h-6 w-6 mr-2" />
                <div>
                  <CardTitle>School Portal Login</CardTitle>
                  <CardDescription className="text-blue-100">
                    Sign in to manage your school's dental care program
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">Demo School Account:</p>
                <p className="text-xs text-blue-700">Email: school@stmarysschool.edu.in</p>
                <p className="text-xs text-blue-700">Password: password</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          School Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="school@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Lock className="h-4 w-4 mr-1" />
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Access School Portal'}
                  </Button>

                  <div className="text-center">
                    <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
                      ← Back to main login
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}