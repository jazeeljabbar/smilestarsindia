import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Login() {
  const [, setLocation] = useLocation();

  // Redirect to magic link authentication  
  React.useEffect(() => {
    setLocation('/auth/magic-link');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Redirecting to Magic Link Authentication
          </CardTitle>
          <CardDescription className="text-gray-600">
            Please wait while we redirect you to the new authentication system...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}