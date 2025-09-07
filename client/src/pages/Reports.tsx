import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Send, Eye, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth.tsx';
import { colorSchemes } from '@/lib/colorSchemes';
import jsPDF from 'jspdf';

export function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCamp, setSelectedCamp] = useState<string>('all');
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/reports'],
    queryFn: () => apiRequest('/reports'),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
    queryFn: () => apiRequest('/students'),
  });

  const { data: screenings = [] } = useQuery({
    queryKey: ['/api/screenings'],
    queryFn: () => apiRequest('/screenings'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['/api/camps'],
    queryFn: () => apiRequest('/camps'),
  });

  const generateReportMutation = useMutation({
    mutationFn: (reportData: any) => apiRequest('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: 'Success',
        description: 'Report generated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    },
  });

  const sendReportMutation = useMutation({
    mutationFn: (reportId: number) => apiRequest(`/reports/${reportId}/send`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: 'Success',
        description: 'Report sent to parent successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send report',
        variant: 'destructive',
      });
    },
  });

  const generatePDF = (student: any, screening: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(25, 118, 210);
    doc.text('Smile Stars India', 20, 30);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Dental Health Report', 20, 45);
    
    // Student Information
    doc.setFontSize(12);
    doc.text(`Student Name: ${student.name}`, 20, 70);
    doc.text(`Age: ${student.age} years`, 20, 85);
    doc.text(`Grade: ${student.grade}`, 20, 100);
    doc.text(`School: ${student.schoolName || 'School Name'}`, 20, 115);
    doc.text(`Examination Date: ${new Date(screening.createdAt).toLocaleDateString()}`, 20, 130);
    
    // Clinical Findings
    doc.setFontSize(14);
    doc.text('Clinical Examination Summary', 20, 155);
    
    doc.setFontSize(10);
    let yPos = 170;
    
    if (screening.decayedTeethCount > 0) {
      doc.text(`• Decayed Teeth: ${screening.decayedTeethCount}`, 25, yPos);
      yPos += 15;
    }
    
    if (screening.missingTeethCount > 0) {
      doc.text(`• Missing Teeth: ${screening.missingTeethCount}`, 25, yPos);
      yPos += 15;
    }
    
    if (screening.filledTeethCount > 0) {
      doc.text(`• Filled Teeth: ${screening.filledTeethCount}`, 25, yPos);
      yPos += 15;
    }
    
    if (screening.stains) {
      doc.text(`• Stains: ${screening.stains}`, 25, yPos);
      yPos += 15;
    }
    
    if (screening.calculus) {
      doc.text(`• Calculus: ${screening.calculus}`, 25, yPos);
      yPos += 15;
    }
    
    // Recommendations
    if (screening.preventiveMeasures) {
      yPos += 10;
      doc.setFontSize(12);
      doc.text('Recommendations:', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(screening.preventiveMeasures, 170);
      doc.text(splitText, 25, yPos);
    }
    
    return doc;
  };

  const downloadReport = (student: any, screening: any) => {
    const pdf = generatePDF(student, screening);
    pdf.save(`dental-report-${student.name.replace(/\s+/g, '-')}.pdf`);
  };

  const generateReport = async (student: any, screening: any) => {
    const pdf = generatePDF(student, screening);
    const pdfData = pdf.output('datauristring').split(',')[1]; // Get base64 data
    
    const reportData = {
      screeningId: screening.id,
      studentId: student.id,
      pdfData,
      sentToParent: false,
    };
    
    generateReportMutation.mutate(reportData);
  };

  const completedScreenings = screenings.filter((s: any) => s.isCompleted);
  const studentsWithReports = students.map((student: any) => {
    const screening = screenings.find((s: any) => s.studentId === student.id && s.isCompleted);
    const report = reports.find((r: any) => r.studentId === student.id);
    const camp = camps.find((c: any) => c.id === student.campId);
    
    return {
      ...student,
      screening,
      report,
      camp,
      hasScreening: !!screening,
      hasReport: !!report,
    };
  }).filter((student: any) => student.hasScreening);

  const filteredStudents = studentsWithReports.filter((student: any) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCamp = selectedCamp === 'all' || student.campId.toString() === selectedCamp;
    return matchesSearch && matchesCamp;
  });

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dental Health Reports</h1>
          <p className="text-gray-600">
            Generate and manage dental health reports for students
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedCamp} onValueChange={setSelectedCamp}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by camp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map((camp: any) => (
              <SelectItem key={camp.id} value={camp.id.toString()}>
                {camp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Screenings Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{completedScreenings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Reports Generated</p>
                <p className="text-2xl font-semibold text-gray-900">{reports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Send className="text-yellow-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Reports Sent</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {reports.filter((r: any) => r.sentToParent).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Filter className="text-red-600 h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Reports</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {completedScreenings.length - reports.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Camp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Screening Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            Grade: {student.grade} • Roll: {student.rollNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.camp?.name || 'Unknown Camp'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.screening ? new Date(student.screening.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.hasReport ? (
                        <div className="space-y-1">
                          <Badge className="bg-green-100 text-green-800">
                            Generated
                          </Badge>
                          {student.report.sentToParent && (
                            <Badge className="bg-blue-100 text-blue-800 block">
                              Sent to Parent
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          Not Generated
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {student.hasReport ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => downloadReport(student, student.screening)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user?.role === 'admin' && !student.report.sentToParent && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => sendReportMutation.mutate(student.report.id)}
                              disabled={sendReportMutation.isPending}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => generateReport(student, student.screening)}
                          disabled={generateReportMutation.isPending}
                          className={colorSchemes.reports.text}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredStudents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCamp !== 'all' 
                ? 'Try adjusting your filters or search terms.'
                : 'Complete student screenings to generate reports.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report Preview Modal */}
      {showPreview && previewReport && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Dental Health Report Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Report content would go here */}
              <div className="text-center text-gray-500">
                Report preview will be displayed here
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
