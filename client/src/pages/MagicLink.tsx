import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  status: string;
}

interface Agreement {
  id: number;
  title: string;
  bodyMd: string;
}

export default function MagicLink() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'request' | 'consume' | 'agreements'>('request');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [pendingAgreements, setPendingAgreements] = useState<Agreement[]>([]);

  // Check for token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      consumeMagicLink(token);
    }
  }, []);

  const requestMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Magic link sent! Check your email and click the link to log in.');
        setStep('consume');
      } else {
        setError(data.error || 'Failed to send magic link');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const consumeMagicLink = async (token: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/magic-link/consume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        
        // Store JWT token
        localStorage.setItem('token', data.token);
        
        if (data.requiresAgreements && data.pendingAgreements.length > 0) {
          setPendingAgreements(data.pendingAgreements);
          setStep('agreements');
        } else {
          // Redirect to dashboard
          setMessage('Login successful! Redirecting to dashboard...');
          setTimeout(() => {
            setLocation('/dashboard');
          }, 2000);
        }
      } else {
        setError(data.error || 'Invalid or expired token');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const acceptAgreements = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/accept-agreements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          agreementIds: pendingAgreements.map(a => a.id) 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Agreements accepted! Redirecting to dashboard...');
        setTimeout(() => {
          setLocation('/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Failed to accept agreements');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderRequestStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Mail className="h-6 w-6" />
          Login to Smile Stars India
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && requestMagicLink()}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={requestMagicLink} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Magic Link...
            </>
          ) : (
            'Send Magic Link'
          )}
        </Button>
        
        <div className="text-center text-sm text-gray-600">
          Enter your email to receive a secure login link
        </div>
      </CardContent>
    </Card>
  );

  const renderConsumeStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Check Your Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="flex justify-center">
          <Mail className="h-16 w-16 text-blue-500" />
        </div>
        
        <div className="space-y-2">
          <p className="text-lg font-medium">Magic link sent!</p>
          <p className="text-gray-600">
            We've sent a secure login link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Check your email and click the link to complete your login.
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => setStep('request')}
          className="w-full"
        >
          Try Different Email
        </Button>
      </CardContent>
    </Card>
  );

  const renderAgreementsStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome, {user?.name}!</CardTitle>
        <p className="text-gray-600">
          Please review and accept the following agreements before proceeding.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {pendingAgreements.map((agreement) => (
          <div key={agreement.id} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{agreement.title}</h3>
            <div className="max-h-60 overflow-y-auto bg-gray-50 p-4 rounded text-sm">
              <pre className="whitespace-pre-wrap">{agreement.bodyMd}</pre>
            </div>
          </div>
        ))}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-4">
          <Button 
            onClick={acceptAgreements}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept All Agreements'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {step === 'request' && renderRequestStep()}
      {step === 'consume' && renderConsumeStep()}
      {step === 'agreements' && renderAgreementsStep()}
    </div>
  );
}