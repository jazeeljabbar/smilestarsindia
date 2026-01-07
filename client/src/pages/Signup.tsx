import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowLeft, User, Phone, CheckCircle2 } from 'lucide-react';

const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(10, 'Please enter a valid phone number'),
    role: z.enum(['SCHOOL', 'DENTIST', 'PARENT'], {
        required_error: 'Please select a role',
    }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export function Signup() {
    const [, setLocation] = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const form = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: SignupForm) => {
        setIsLoading(true);
        setError('');

        // Simulate API call since no backend endpoint exists yet
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log('Signup Intent:', data);
            setIsSuccess(true);
            toast({
                title: 'Request Submitted',
                description: 'We have received your registration request. We will contact you shortly.',
            });

        } catch (error) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">Request Received</h2>
                        <p className="text-muted-foreground">
                            Thank you for your interest in Smile Stars India. We've received your details and our team will get in touch with you shortly to verify your account.
                        </p>
                    </div>
                    <Link href="/login">
                        <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-full">
                            Return to Sign In
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

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
                        Join the Movement for <br />
                        <span className="italic font-light">Better Oral Health.</span>
                    </h2>
                    <p className="text-lg text-white/80 leading-relaxed mb-8">
                        Register your interest to start managing screenings, tracking progress, and making a real difference in student health.
                    </p>

                    {/* Steps or Benefits */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">1</div>
                            <p className="text-white/80">Easy digital screenings</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">2</div>
                            <p className="text-white/80">Comprehensive reporting</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">3</div>
                            <p className="text-white/80">Secure data management</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-sm text-white/40">
                    © 2025 Smile Stars India. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background overflow-y-auto">
                <div className="w-full max-w-md space-y-8 my-auto">
                    <div className="lg:hidden mb-8">
                        <Link href="/">
                            <div className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Home</span>
                            </div>
                        </Link>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">Request Registration</h2>
                        <p className="text-muted-foreground">
                            Please provide your details and role. We will contact you to verify and activate your account.
                        </p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="John Doe"
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

                            <div className="grid grid-cols-2 gap-4">
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
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="+91..."
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
                            </div>

                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>I am registering as a</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                            <FormControl>
                                                <SelectTrigger className="h-11 bg-muted/30 border-muted-foreground/20 focus:ring-primary rounded-xl">
                                                    <SelectValue placeholder="Select your role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="SCHOOL">School Administrator</SelectItem>
                                                <SelectItem value="DENTIST">Dental Professional</SelectItem>
                                                <SelectItem value="PARENT">Parent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Create Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Create password"
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

                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Confirm password"
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
                            </div>

                            {error && (
                                <Alert variant="destructive" className="bg-destructive/5 text-destructive border-destructive/20 rounded-xl">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-full text-base font-semibold shadow-lg hover:shadow-primary/20 transition-all font-serif"
                                >
                                    {isLoading ? 'Submitting Request...' : 'Submit Registration Request'}
                                </Button>
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                                Already have an account?{' '}
                                <Link href="/login">
                                    <span className="font-semibold text-primary hover:text-primary/80 cursor-pointer">
                                        Sign In
                                    </span>
                                </Link>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}
