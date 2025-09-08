import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
// Note: Using div with overflow-y-auto instead of ScrollArea for now
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth.tsx';
import { useToast } from '@/hooks/use-toast';

interface Agreement {
  id: number;
  title: string;
  bodyMd: string;
}

interface PendingUser {
  id: number;
  email: string;
  name: string;
  roles: string[];
  status: string;
}

export function AgreementPage() {
  const [, setLocation] = useLocation();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [user, setUser] = useState<PendingUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [acceptedAgreements, setAcceptedAgreements] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Get pending data from localStorage
    const pendingToken = localStorage.getItem('pendingToken');
    const pendingUser = localStorage.getItem('pendingUser');
    const pendingAgreements = localStorage.getItem('pendingAgreements');

    if (!pendingToken || !pendingUser || !pendingAgreements) {
      // No pending data, redirect to login
      setLocation('/login');
      return;
    }

    try {
      setToken(pendingToken);
      setUser(JSON.parse(pendingUser));
      setAgreements(JSON.parse(pendingAgreements));
    } catch (error) {
      console.error('Failed to parse pending data:', error);
      setLocation('/login');
    }
  }, [setLocation]);

  const handleAgreementChange = (agreementId: number, accepted: boolean) => {
    const newAccepted = new Set(acceptedAgreements);
    if (accepted) {
      newAccepted.add(agreementId);
    } else {
      newAccepted.delete(agreementId);
    }
    setAcceptedAgreements(newAccepted);
  };

  const handleAcceptAgreements = async () => {
    if (!token || !user || acceptedAgreements.size !== agreements.length) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/accept-agreements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agreementIds: Array.from(acceptedAgreements),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Clear pending data
        localStorage.removeItem('pendingToken');
        localStorage.removeItem('pendingUser');
        localStorage.removeItem('pendingAgreements');

        // Store actual token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Update auth context
        login(token, user);

        toast({
          title: 'Agreements Accepted',
          description: 'Welcome! You can now access the platform.',
        });

        // Redirect to dashboard
        setLocation('/dashboard');
      } else {
        setError(result.error || 'Failed to accept agreements');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !agreements.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const allAgreed = acceptedAgreements.size === agreements.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to Smile Stars India
          </CardTitle>
          <CardDescription className="text-gray-600">
            Please review and accept the following agreements to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {agreements.map((agreement) => (
            <Card key={agreement.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`agreement-${agreement.id}`}
                    checked={acceptedAgreements.has(agreement.id)}
                    onCheckedChange={(checked) =>
                      handleAgreementChange(agreement.id, !!checked)
                    }
                  />
                  <CardTitle className="text-lg">{agreement.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full rounded-md border p-4 overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    {/* Render markdown content as plain text for now */}
                    <pre className="whitespace-pre-wrap text-sm">
                      {agreement.bodyMd}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between items-center pt-6">
            <Button
              variant="outline"
              onClick={() => setLocation('/login')}
              disabled={isLoading}
            >
              Back to Login
            </Button>
            <Button
              onClick={handleAcceptAgreements}
              disabled={!allAgreed || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Processing...' : 'Accept All Agreements & Continue'}
            </Button>
          </div>

          {!allAgreed && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please accept all agreements to continue using the platform.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}