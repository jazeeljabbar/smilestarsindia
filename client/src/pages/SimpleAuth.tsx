import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SimpleAuth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      } else {
        setError(data.error || 'Failed to send magic link');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to Smile Stars India
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter your email to receive a secure login link
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
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
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
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
          </form>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Development Magic Links Available:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>System Admin:</strong> admin@smilestars.com</p>
              <p><strong>Org Admin:</strong> orgadmin@smilestars.com</p>
              <p><strong>Franchise Admin:</strong> rajesh@happysmiles.com</p>
              <p><strong>Principal:</strong> principal@sunriseschool.edu</p>
              <p><strong>School Admin:</strong> admin@sunriseschool.edu</p>
              <p><strong>Dentist:</strong> dentist@smilestars.com</p>
              <p><strong>Parent:</strong> suresh.patel@email.com</p>
              <p className="text-blue-600 mt-2">Check server console for generated magic links!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}