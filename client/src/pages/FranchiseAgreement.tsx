import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, FileText, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function FranchiseAgreement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const agreementToken = urlParams.get('token');
    if (agreementToken) {
      setToken(agreementToken);
    } else {
      toast({
        title: 'Invalid Link',
        description: 'Agreement token is missing. Please use the link from your email.',
        variant: 'destructive',
      });
      setLocation('/');
    }
  }, []);

  const { data: agreementData, isLoading, error } = useQuery({
    queryKey: ['/api/franchise/agreement', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      const response = await fetch(`/api/franchise/agreement/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch agreement details');
      }
      return response.json();
    },
    enabled: !!token,
  });

  const acceptAgreementMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/franchise/accept-agreement', {
        method: 'POST',
        body: { token },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Agreement Accepted!',
        description: 'Welcome to Smile Stars India! You can now access your dashboard.',
      });
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        setLocation('/admin-login');
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept agreement',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !agreementData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Agreement Link</h2>
            <p className="text-gray-600 mb-4">
              {error?.message || 'This agreement link is invalid or has expired.'}
            </p>
            <Button onClick={() => setLocation('/')}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { franchise } = agreementData;

  if (franchise.agreementStatus === 'accepted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Agreement Already Accepted</h2>
            <p className="text-gray-600 mb-4">
              You have already accepted the franchise agreement. You can now log in to your dashboard.
            </p>
            <Button onClick={() => setLocation('/admin-login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 rounded-full p-3">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Smile Stars India
          </h1>
          <p className="text-lg text-gray-600">
            Franchise Agreement for {franchise.region} Region
          </p>
        </div>

        {/* Franchise Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Franchise Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Franchise Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Franchise Name:</span>
                    <p className="text-gray-900">{franchise.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Region:</span>
                    <p className="text-gray-900">{franchise.region}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <Badge variant="outline" className="ml-2">
                      {franchise.agreementStatus}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Contact Person:</span>
                    <p className="text-gray-900">{franchise.contactPerson}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <p className="text-gray-900">{franchise.contactEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Franchise Agreement Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>1. Franchise Rights and Responsibilities</h3>
              <p>
                By accepting this agreement, you are granted the exclusive rights to operate 
                Smile Stars India dental care camps in the {franchise.region} region. As a franchisee, 
                you will have the following capabilities:
              </p>
              <ul>
                <li>Create and manage schools within your assigned region</li>
                <li>Register students for dental screening camps</li>
                <li>Schedule and organize dental camps</li>
                <li>Recruit and manage dentists, lab technicians, and support staff</li>
                <li>Assign medical professionals to camps</li>
                <li>Monitor camp operations and student health outcomes</li>
              </ul>

              <h3>2. Quality Standards</h3>
              <p>
                You agree to maintain the highest standards of dental care and follow all 
                Smile Stars India protocols for:
              </p>
              <ul>
                <li>Student safety and health screening procedures</li>
                <li>Equipment sterilization and hygiene standards</li>
                <li>Professional conduct of all medical staff</li>
                <li>Accurate record keeping and reporting</li>
              </ul>

              <h3>3. Training and Support</h3>
              <p>
                Smile Stars India will provide comprehensive training on platform usage, 
                operational procedures, and ongoing support for franchise operations.
              </p>

              <h3>4. Compliance</h3>
              <p>
                You agree to comply with all local healthcare regulations and maintain 
                necessary licenses for operating dental care services in your region.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-gray-600 mb-6">
                By clicking "Accept Agreement", you confirm that you have read and agree to all 
                terms and conditions outlined above. Your account will be activated immediately, 
                and you can begin managing your franchise operations.
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => acceptAgreementMutation.mutate()}
                  disabled={acceptAgreementMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {acceptAgreementMutation.isPending ? 'Processing...' : 'Accept Agreement'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}