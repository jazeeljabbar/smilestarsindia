import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { School, Camp, Student } from '@shared/schema';
import { School as SchoolIcon, Users, Calendar, GraduationCap, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth.tsx';

export default function SchoolAdminDashboard() {
  console.log('SchoolAdminDashboard component rendered');
  const [showAgreement, setShowAgreement] = useState(false);
  const { user } = useAuth();

  // Get current user's school
  const { data: school, isLoading, error } = useQuery<School>({
    queryKey: ['/api/schools/my-school'],
    queryFn: () => apiRequest('/schools/my-school'),
    retry: false,
  });

  console.log('School query state:', { school, isLoading, error });

  // Get camps for this school
  const { data: camps = [] } = useQuery<Camp[]>({
    queryKey: ['/api/camps/my-school'],
    queryFn: () => apiRequest('/camps/my-school'),
  });

  // Get students for this school
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['/api/students/my-school'],
    queryFn: () => apiRequest('/students/my-school'),
  });

  // Agreement acceptance mutation  
  const acceptAgreementMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/auth/accept-agreements', {
        method: 'POST',
        body: JSON.stringify({
          agreementIds: [2], // School agreement ID (different from franchise)
          entityId: school?.id // Include school entity ID to activate
        })
      });
    },
    onSuccess: () => {
      // Invalidate and refetch the school data
      queryClient.invalidateQueries({ queryKey: ['/api/schools/my-school'] });
      queryClient.refetchQueries({ queryKey: ['/api/schools/my-school'] });
      
      toast({
        title: 'Agreement Accepted',
        description: 'Your school agreement has been successfully accepted. You can now access all features.',
      });
      setShowAgreement(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Show agreement modal on first login if school is in DRAFT status - MANDATORY
  const shouldShowAgreement = school && school.status === 'DRAFT';

  if (isLoading) {
    console.log('School data is loading...');
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    console.log('School query error:', error);
    return (
      <div className="text-center py-12">
        <SchoolIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading School</h2>
        <p className="text-gray-600">Error: {error.message}</p>
      </div>
    );
  }

  if (!school) {
    console.log('No school data found');
    return (
      <div className="text-center py-12">
        <SchoolIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">School Not Found</h2>
        <p className="text-gray-600">No school is associated with your account. Please contact support.</p>
      </div>
    );
  }

  const activeCamps = camps.filter(camp => camp.status === 'active').length;
  const totalStudents = students.length;
  const completedCamps = camps.filter(camp => camp.status === 'completed').length;

  // If agreement is pending, show only the agreement modal
  if (shouldShowAgreement) {
    return (
      <div className="space-y-6">
        {/* Agreement Modal - Mandatory */}
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>School Agreement - Smile Stars India</DialogTitle>
              <DialogDescription>
                Welcome! Please review and accept the agreement to activate your school account and access the platform features.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              <div className="space-y-4 text-sm">
                <h3 className="font-semibold text-lg">Terms and Conditions for School Partnership</h3>
                
                <div className="space-y-3">
                  <h4 className="font-medium">1. Partnership Overview</h4>
                  <p>
                    By registering {school.name} with Smile Stars India, you agree to participate in our preventive 
                    dental care program designed to improve oral health outcomes for school children.
                  </p>

                  <h4 className="font-medium">2. School Responsibilities</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Provide accurate student enrollment data for dental camps</li>
                    <li>Ensure proper communication with parents regarding dental screenings</li>
                    <li>Facilitate access to school premises for dental team visits</li>
                    <li>Maintain confidentiality of student health information</li>
                    <li>Support follow-up communications with parents</li>
                  </ul>

                  <h4 className="font-medium">3. Smile Stars India Services</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Comprehensive dental screenings by qualified dentists</li>
                    <li>Digital dental charts and health records</li>
                    <li>Parent communication and report delivery</li>
                    <li>Preventive care recommendations</li>
                    <li>Follow-up support and guidance</li>
                  </ul>

                  <h4 className="font-medium">4. Data Privacy and Security</h4>
                  <p>
                    All student health information will be handled in accordance with applicable privacy laws. 
                    Data will be used solely for the purpose of providing dental care services and parent communication.
                  </p>

                  <h4 className="font-medium">5. Program Duration</h4>
                  <p>
                    This agreement remains valid for the academic year and may be renewed annually based on 
                    mutual agreement and program effectiveness.
                  </p>

                  <h4 className="font-medium">6. Contact Information</h4>
                  <p>
                    For any questions or concerns regarding this agreement, please contact your assigned 
                    franchisee or our support team.
                  </p>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button 
                onClick={() => acceptAgreementMutation.mutate()}
                disabled={acceptAgreementMutation.isPending}
                className="bg-green-600 hover:bg-green-700 w-full"
              >
                {acceptAgreementMutation.isPending ? 'Accepting Agreement...' : 'Accept Agreement & Access Dashboard'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <p className="text-green-100 mb-2">
              {school.city}, {school.state} • {school.pincode}
            </p>
            <p className="text-green-100 mt-1 mb-2">
              Contact: {school.contactPerson} • {school.contactPhone}
            </p>
            <div className="mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <SchoolIcon className="h-4 w-4 mr-2" />
                {school.name}
              </span>
            </div>
          </div>
          <div className="text-right">
            <Badge 
              variant={school.agreementStatus === 'accepted' ? 'default' : 'secondary'}
              className={school.agreementStatus === 'accepted' 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-yellow-500 hover:bg-yellow-600'
              }
            >
              {school.agreementStatus === 'accepted' ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </>
              ) : (
                'Pending Agreement'
              )}
            </Badge>
            {school.agreementStatus === 'pending' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => setShowAgreement(true)}
              >
                Review Agreement
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Camps</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCamps}</div>
            <p className="text-xs text-muted-foreground">
              Ongoing dental camps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Registered in camps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Camps</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{completedCamps}</div>
            <p className="text-xs text-muted-foreground">
              Successfully finished
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Camps */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Camps</CardTitle>
          <CardDescription>
            Dental camps scheduled for your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          {school.agreementStatus === 'accepted' ? (
            camps.length > 0 ? (
              <div className="space-y-4">
                {camps.slice(0, 5).map((camp: Camp) => (
                  <div key={camp.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{camp.name}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expected Students: {camp.expectedStudents}
                      </p>
                      {camp.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {camp.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      camp.status === 'active' ? 'default' :
                      camp.status === 'completed' ? 'secondary' : 'outline'
                    }>
                      {camp.status}
                    </Badge>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Camps are scheduled by your franchisee. You can view camp details and manage student registrations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No camps scheduled yet</p>
                <p className="text-sm text-gray-500">Camps will be scheduled by your franchisee</p>
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <p className="text-gray-600">Agreement Required</p>
              <p className="text-sm text-gray-500">Please accept the school agreement to view camp information</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional Agreement Review Modal (for accepted schools) */}
      <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>School Agreement - Smile Stars India</DialogTitle>
            <DialogDescription>
              Review your accepted agreement
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96 w-full border rounded-md p-4">
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-lg">Terms and Conditions for School Partnership</h3>
              
              <div className="space-y-3">
                <h4 className="font-medium">1. Partnership Overview</h4>
                <p>
                  By registering {school.name} with Smile Stars India, you agree to participate in our preventive 
                  dental care program designed to improve oral health outcomes for school children.
                </p>

                <h4 className="font-medium">2. School Responsibilities</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide accurate student enrollment data for dental camps</li>
                  <li>Ensure proper communication with parents regarding dental screenings</li>
                  <li>Facilitate access to school premises for dental team visits</li>
                  <li>Maintain confidentiality of student health information</li>
                  <li>Support follow-up communications with parents</li>
                </ul>

                <h4 className="font-medium">3. Smile Stars India Services</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Comprehensive dental screenings by qualified dentists</li>
                  <li>Digital dental charts and health records</li>
                  <li>Parent communication and report delivery</li>
                  <li>Preventive care recommendations</li>
                  <li>Follow-up support and guidance</li>
                </ul>

                <h4 className="font-medium">4. Data Privacy and Security</h4>
                <p>
                  All student health information will be handled in accordance with applicable privacy laws. 
                  Data will be used solely for the purpose of providing dental care services and parent communication.
                </p>

                <h4 className="font-medium">5. Program Duration</h4>
                <p>
                  This agreement remains valid for the academic year and may be renewed annually based on 
                  mutual agreement and program effectiveness.
                </p>

                <h4 className="font-medium">6. Contact Information</h4>
                <p>
                  For any questions or concerns regarding this agreement, please contact your assigned 
                  franchisee or our support team.
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAgreement(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}