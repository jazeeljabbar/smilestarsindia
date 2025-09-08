import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, CheckCircle, Eye, EyeOff, Lock, Mail, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FranchiseAgreement() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [acceptedAgreements, setAcceptedAgreements] = useState<number[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({
        title: 'Error',
        description: 'Invalid agreement link',
        variant: 'destructive',
      });
      setLocation('/');
      return;
    }

    const consumeToken = async () => {
      try {
        const response = await fetch('/api/auth/magic-link/consume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load agreement');
        }

        if (data.tokenType === 'FRANCHISE_AGREEMENT') {
          setTokenData(data);
          setAgreements(data.pendingAgreements || []);
        } else {
          throw new Error('Invalid franchise agreement token');
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load franchise agreement',
          variant: 'destructive',
        });
        setLocation('/');
      } finally {
        setIsLoading(false);
      }
    };

    consumeToken();
  }, [token, toast, setLocation]);

  const handleAcceptAgreement = (agreementId: number, accepted: boolean) => {
    if (accepted) {
      setAcceptedAgreements(prev => [...prev.filter(id => id !== agreementId), agreementId]);
    } else {
      setAcceptedAgreements(prev => prev.filter(id => id !== agreementId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (acceptedAgreements.length !== agreements.length) {
      toast({
        title: 'Error',
        description: 'Please accept all agreements to continue',
        variant: 'destructive',
      });
      return;
    }

    if (tokenData.requiresPasswordSetup) {
      if (!password || password.length < 6) {
        toast({
          title: 'Error',
          description: 'Password must be at least 6 characters long',
          variant: 'destructive',
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: 'Error',
          description: 'Passwords do not match',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/accept-agreements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agreementIds: acceptedAgreements,
          token: token,
          password: tokenData.requiresPasswordSetup ? password : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept agreements');
      }

      toast({
        title: 'Success',
        description: 'Franchise activated successfully! You can now log in.',
      });

      // Redirect to login page
      setLocation('/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate franchise',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading franchise agreement...</p>
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Smile Stars India
          </h1>
          <p className="text-gray-600">
            Complete your franchise setup for {tokenData.franchisee?.name}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{tokenData.user?.email}</span>
                </div>
              </div>
              <div>
                <Label>Name</Label>
                <span className="block mt-1">
                  {tokenData.user?.firstName} {tokenData.user?.lastName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {tokenData.requiresPasswordSetup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Set Your Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a strong password (min 6 characters)"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Agreements & Terms</CardTitle>
              <p className="text-sm text-gray-600">
                Please read and accept all agreements to activate your franchise.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {agreements.map((agreement) => (
                <div key={agreement.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Checkbox
                      id={`agreement-${agreement.id}`}
                      checked={acceptedAgreements.includes(agreement.id)}
                      onCheckedChange={(checked) => handleAcceptAgreement(agreement.id, checked as boolean)}
                    />
                    <Label htmlFor={`agreement-${agreement.id}`} className="text-base font-medium">
                      {agreement.title}
                    </Label>
                  </div>
                  <div className="ml-6">
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: agreement.bodyMd || 'Agreement content not available.' }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || acceptedAgreements.length !== agreements.length}
              className="px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating Franchise...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate Franchise & Complete Setup
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}