import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'wouter';
import { Smile, Heart, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/lib/auth.tsx';
import { useToast } from '@/hooks/use-toast';
import { loginSchema, type LoginData } from '@shared/schema';

export function ParentLogin() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'parent@example.com',
      password: 'password',
    },
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: 'Welcome to Parent Portal',
        description: 'You can now view your child\'s dental health information.',
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
          <p className="text-gray-500 mt-2">Sign in to view your child's dental health information</p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="bg-pink-600 text-white rounded-t-lg">
              <div className="flex items-center">
                <Heart className="h-6 w-6 mr-2" />
                <div>
                  <CardTitle>Parent Portal Login</CardTitle>
                  <CardDescription className="text-pink-100">
                    Access your child's dental screening reports
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          Parent Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="parent@example.com"
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

                  <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Access Parent Portal'}
                  </Button>

                  <div className="text-center">
                    <Link href="/login" className="text-sm text-pink-600 hover:text-pink-800">
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