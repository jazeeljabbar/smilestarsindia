import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth.tsx';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@smilestars.com',
      password: '12345',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.user.status === 'PENDING' && result.requiresAgreements) {
          localStorage.setItem('pendingToken', result.token);
          localStorage.setItem('pendingUser', JSON.stringify(result.user));
          localStorage.setItem('pendingAgreements', JSON.stringify(result.pendingAgreements));
          setLocation('/auth/agreements');
          return;
        }

        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        login(result.token, result.user);

        toast({
          title: 'Welcome back!',
          description: `Logged in successfully as ${result.user.name}`,
        });

        setLocation('/dashboard');
      } else {
        if (result.status === 'SUSPENDED') {
          setError(`${result.error}: ${result.message}`);
        } else if (result.requiresMagicLink) {
          setError(result.error + ' Please contact your administrator.');
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex w-1/2 bg-[#2B5740] flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer mb-8">
              <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm border border-white/20">
                <img src="/logo.png" alt="Smile Stars India Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">smyl stars india</h1>
                <span className="text-[0.65rem] text-white/80 font-medium tracking-wider uppercase">Safeguarding Little Smiles</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-serif font-bold mb-6 leading-tight">
            Building a Healthier, <br />
            <span className="italic font-light">Happier Future.</span>
          </h2>
          <p className="text-lg text-white/80 leading-relaxed mb-8">
            Join the platform that connects dental professionals, schools, and families for a seamless oral health journey.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <p className="text-2xl font-bold mb-1">15k+</p>
              <p className="text-sm text-white/70">Students Screened</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <p className="text-2xl font-bold mb-1">200+</p>
              <p className="text-sm text-white/70">Schools Partnered</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/40">
          © 2025 Smile Stars India. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-8">
            <Link href="/">
              <div className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </div>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-primary leading-none">smyl stars india</h1>
              <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase mt-1">Safeguarding Little Smiles</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-gray-900">Welcome back</h2>
            <p className="text-muted-foreground">
              Please enter your details to sign in.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="name@example.com"
                          className="pl-9 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary focus:ring-primary rounded-xl"
                          disabled={isLoading}
                          {...field}
                        />
                      </div>
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Button variant="link" size="sm" className="px-0 font-normal text-muted-foreground hover:text-primary h-auto">
                        Forgot password?
                      </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          className="pl-9 pr-10 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary focus:ring-primary rounded-xl"
                          disabled={isLoading}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive" className="bg-destructive/5 text-destructive border-destructive/20 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-full text-base font-semibold shadow-lg hover:shadow-primary/20 transition-all font-serif"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/signup">
                    <span className="font-semibold text-primary hover:text-primary/80 cursor-pointer">
                      Sign up for free
                    </span>
                  </Link>
                </div>
              </div>
            </form>
          </Form>

          {/* Development Hint - Hidden behind logic or minimalized */}
          {/* Keeping it simple and minimal as requested */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              <span className="opacity-50">Admin Test: admin@smilestars.com / 12345</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}