import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Eye, Calendar, User, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth.tsx';

export function ParentPortal() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportDetail, setShowReportDetail] = useState(false);
  const [childEmail, setChildEmail] = useState('');

  // Optimized: Only fetch reports for current parent's children
  const { data: childrenReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/reports/my-children'],
    queryFn: () => apiRequest('/reports/my-children'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const viewReportDetail = (report: any) => {
    setSelectedReport(report);
    setShowReportDetail(true);
  };

  const downloadReport = (report: any) => {
    if (report.pdfData) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${report.pdfData}`;
      link.download = `dental-report-${report.student.name.replace(/\s+/g, '-')}.pdf`;
      link.click();
    }
  };

  const getDentalHealthSummary = (screening: any) => {
    if (!screening) return { status: 'unknown', message: 'No screening data available' };
    
    const totalIssues = (screening.decayedTeethCount || 0) + (screening.missingTeethCount || 0);
    
    if (totalIssues === 0) {
      return { status: 'excellent', message: 'Excellent dental health' };
    } else if (totalIssues <= 2) {
      return { status: 'good', message: 'Good dental health with minor issues' };
    } else if (totalIssues <= 5) {
      return { status: 'fair', message: 'Fair dental health - attention needed' };
    } else {
      return { status: 'poor', message: 'Poor dental health - immediate attention required' };
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      excellent: { className: 'bg-green-100 text-green-800' },
      good: { className: 'bg-blue-100 text-blue-800' },
      fair: { className: 'bg-yellow-100 text-yellow-800' },
      poor: { className: 'bg-red-100 text-red-800' },
    };
    return variants[status] || variants.fair;
  };

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Parent Portal</h1>
        <p className="text-gray-600">
          View your child's dental health reports and recommendations
        </p>
      </div>

      {/* Welcome Message */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Welcome, {user?.name || 'Parent'}</h2>
              <p className="text-gray-600">
                Here you can access your child's dental health reports from recent school dental camps.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Reports</p>
                <p className="text-2xl font-semibold text-gray-900">{childrenReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <User className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Children Screened</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {new Set(childrenReports.map(r => r.studentId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-yellow-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Latest Report</p>
                <p className="text-sm font-semibold text-gray-900">
                  {childrenReports.length > 0 
                    ? new Date(Math.max(...childrenReports.map(r => new Date(r.createdAt).getTime()))).toLocaleDateString()
                    : 'No reports'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Child's Dental Health Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {childrenReports.length > 0 ? (
            <div className="space-y-4">
              {childrenReports.map((report: any) => {
                const healthSummary = getDentalHealthSummary(report.screening);
                
                return (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {report.student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{report.student.name}</h3>
                            <p className="text-sm text-gray-500">
                              Age: {report.student.age} • Grade: {report.student.grade}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <School className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {report.camp?.name || 'Unknown Camp'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-4">
                          <Badge {...getStatusBadge(healthSummary.status)}>
                            {healthSummary.message}
                          </Badge>
                          {report.sentToParent && (
                            <Badge className="bg-green-100 text-green-800">
                              Sent via Email
                            </Badge>
                          )}
                        </div>
                        
                        {report.screening && (
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Decayed Teeth:</span>
                                <span className="ml-2 font-medium">{report.screening.decayedTeethCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Missing Teeth:</span>
                                <span className="ml-2 font-medium">{report.screening.missingTeethCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Filled Teeth:</span>
                                <span className="ml-2 font-medium">{report.screening.filledTeethCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Dental Age:</span>
                                <span className="ml-2 font-medium">{report.screening.dentalAge || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewReportDetail(report)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {report.pdfData && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadReport(report)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
              <p className="text-gray-600 mb-4">
                Your child's dental reports will appear here after dental camp screenings are completed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>General Dental Care Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Daily Care</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Brush teeth twice daily with fluoride toothpaste</li>
                <li>• Use proper brushing technique for 2 minutes</li>
                <li>• Floss daily to remove plaque between teeth</li>
                <li>• Rinse with water after meals and snacks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Diet & Lifestyle</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Limit sugary and acidic foods and drinks</li>
                <li>• Choose healthy snacks like fruits and vegetables</li>
                <li>• Drink plenty of water throughout the day</li>
                <li>• Schedule regular dental check-ups every 6 months</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      {showReportDetail && selectedReport && (
        <Dialog open={showReportDetail} onOpenChange={setShowReportDetail}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detailed Dental Health Report - {selectedReport.student.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-blue-700">Smile Stars India</h2>
                    <p className="text-blue-600">Dental Health Report</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Student:</span> {selectedReport.student.name}</p>
                    <p><span className="font-medium">Age:</span> {selectedReport.student.age} years</p>
                    <p><span className="font-medium">Grade:</span> {selectedReport.student.grade}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Camp:</span> {selectedReport.camp?.name}</p>
                    <p><span className="font-medium">Examination Date:</span> {new Date(selectedReport.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              {selectedReport.screening && (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Examination Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {32 - (selectedReport.screening.decayedTeethCount || 0) - (selectedReport.screening.missingTeethCount || 0)}
                        </div>
                        <div className="text-sm text-green-700">Healthy Teeth</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{selectedReport.screening.decayedTeethCount || 0}</div>
                        <div className="text-sm text-red-700">Decayed Teeth</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">{selectedReport.screening.missingTeethCount || 0}</div>
                        <div className="text-sm text-gray-700">Missing Teeth</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{selectedReport.screening.filledTeethCount || 0}</div>
                        <div className="text-sm text-blue-700">Filled Teeth</div>
                      </div>
                    </div>
                    
                    {selectedReport.screening.preventiveMeasures && (
                      <div className="mt-6">
                        <h5 className="font-medium text-gray-900 mb-2">Dentist's Recommendations:</h5>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-gray-700">{selectedReport.screening.preventiveMeasures}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                {selectedReport.pdfData && (
                  <Button onClick={() => downloadReport(selectedReport)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowReportDetail(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
