import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DentalChart } from '@/components/DentalChart';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertScreeningSchema, InsertScreening } from '@shared/schema';

interface ScreeningFormProps {
  studentId?: number;
  campId: number;
  onClose: () => void;
  onComplete: () => void;
}

const screeningFormSchema = insertScreeningSchema.extend({
  // Additional validation rules
  studentName: z.string().min(1, 'Student name is required'),
  studentAge: z.number().min(1).max(18),
  studentGender: z.string().min(1),
  studentGrade: z.string().min(1),
  studentRollNumber: z.string().min(1),
  parentName: z.string().min(1),
  parentPhone: z.string().min(10),
  parentEmail: z.string().email(),
  parentOccupation: z.string().optional(),
});

type ScreeningFormData = z.infer<typeof screeningFormSchema>;

interface ToothState {
  number: string;
  condition: 'healthy' | 'decayed' | 'missing' | 'filled' | 'crowned';
}

export function ScreeningForm({ studentId, campId, onClose, onComplete }: ScreeningFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeeth, setSelectedTeeth] = useState<ToothState[]>([]);
  const [chartMode, setChartMode] = useState<'select' | 'mark'>('mark');
  const [currentCondition, setCurrentCondition] = useState<ToothState['condition']>('decayed');

  const form = useForm<ScreeningFormData>({
    resolver: zodResolver(screeningFormSchema),
    defaultValues: {
      campId,
      studentId: studentId || 0,
      decayedTeethCount: 0,
      missingTeethCount: 0,
      filledTeethCount: 0,
      crownedTeethCount: 0,
      deepGrooves: false,
      gingivalRecession: false,
      primateSpacing: false,
      midlineDiastema: false,
      delayedEruption: false,
      crossBiteUnilateral: false,
      crossBiteBilateral: false,
      crossBiteAnterior: false,
      openBiteAnterior: false,
      openBitePosteriorUnilateral: false,
      openBitePosteriorBilateral: false,
      deepBite: false,
      abnormalFrenalAttachments: false,
      isCompleted: false,
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: (studentData: any) => apiRequest('/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    }),
  });

  const createScreeningMutation = useMutation({
    mutationFn: (screeningData: InsertScreening) => apiRequest('/screenings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(screeningData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screenings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: 'Success',
        description: 'Screening completed successfully',
      });
      onComplete();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save screening',
        variant: 'destructive',
      });
    },
  });

  const handleToothClick = (tooth: ToothState) => {
    setSelectedTeeth(prev => {
      const existing = prev.find(t => t.number === tooth.number);
      if (existing) {
        if (existing.condition === tooth.condition) {
          // Remove if same condition
          return prev.filter(t => t.number !== tooth.number);
        } else {
          // Update condition
          return prev.map(t => t.number === tooth.number ? tooth : t);
        }
      } else {
        // Add new tooth
        return [...prev, tooth];
      }
    });
  };

  const updateCounts = () => {
    const counts = {
      decayed: selectedTeeth.filter(t => t.condition === 'decayed').length,
      missing: selectedTeeth.filter(t => t.condition === 'missing').length,
      filled: selectedTeeth.filter(t => t.condition === 'filled').length,
      crowned: selectedTeeth.filter(t => t.condition === 'crowned').length,
    };

    form.setValue('decayedTeethCount', counts.decayed);
    form.setValue('missingTeethCount', counts.missing);
    form.setValue('filledTeethCount', counts.filled);
    form.setValue('crownedTeethCount', counts.crowned);

    form.setValue('decayedTeeth', selectedTeeth.filter(t => t.condition === 'decayed').map(t => t.number));
    form.setValue('missingTeeth', selectedTeeth.filter(t => t.condition === 'missing').map(t => t.number));
    form.setValue('filledTeeth', selectedTeeth.filter(t => t.condition === 'filled').map(t => t.number));
    form.setValue('crownedTeeth', selectedTeeth.filter(t => t.condition === 'crowned').map(t => t.number));
  };

  useEffect(() => {
    updateCounts();
  }, [selectedTeeth]);

  const onSubmit = async (data: ScreeningFormData) => {
    try {
      let finalStudentId = studentId;

      if (!studentId) {
        // Create new student
        const studentData = {
          name: data.studentName,
          age: data.studentAge,
          gender: data.studentGender,
          grade: data.studentGrade,
          rollNumber: data.studentRollNumber,
          schoolId: 1, // This should come from the camp
          parentName: data.parentName,
          parentPhone: data.parentPhone,
          parentEmail: data.parentEmail,
          parentOccupation: data.parentOccupation,
          campId,
        };

        const newStudent = await createStudentMutation.mutateAsync(studentData);
        finalStudentId = newStudent.id;
      }

      const screeningData: InsertScreening = {
        studentId: finalStudentId!,
        campId: data.campId,
        dentistId: 0, // This will be set by the backend
        teethPresent: selectedTeeth.map(t => t.number),
        dentalAge: data.dentalAge,
        decayedTeethCount: data.decayedTeethCount,
        decayedTeeth: data.decayedTeeth,
        missingTeethCount: data.missingTeethCount,
        missingTeeth: data.missingTeeth,
        filledTeethCount: data.filledTeethCount,
        filledTeeth: data.filledTeeth,
        crownedTeethCount: data.crownedTeethCount,
        crownedTeeth: data.crownedTeeth,
        deepGrooves: data.deepGrooves,
        stains: data.stains,
        calculus: data.calculus,
        gingivalRecession: data.gingivalRecession,
        tongueExamination: data.tongueExamination,
        primateSpacing: data.primateSpacing,
        midlineDiastema: data.midlineDiastema,
        delayedEruption: data.delayedEruption,
        crossBiteUnilateral: data.crossBiteUnilateral,
        crossBiteBilateral: data.crossBiteBilateral,
        crossBiteAnterior: data.crossBiteAnterior,
        crossBiteTeethType: data.crossBiteTeethType,
        openBiteAnterior: data.openBiteAnterior,
        openBitePosteriorUnilateral: data.openBitePosteriorUnilateral,
        openBitePosteriorBilateral: data.openBitePosteriorBilateral,
        deepBite: data.deepBite,
        occlusion: data.occlusion,
        canineRelationshipPrimary: data.canineRelationshipPrimary,
        canineRelationshipPermanent: data.canineRelationshipPermanent,
        molarRelationshipPrimary: data.molarRelationshipPrimary,
        molarRelationshipPermanent: data.molarRelationshipPermanent,
        dentalAnomalies: data.dentalAnomalies,
        abnormalFrenalAttachments: data.abnormalFrenalAttachments,
        developmentalDefects: data.developmentalDefects,
        habits: data.habits,
        traumaType: data.traumaType,
        traumaRootDevelopment: data.traumaRootDevelopment,
        preventiveMeasures: data.preventiveMeasures,
        isCompleted: true,
      };

      createScreeningMutation.mutate(screeningData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit screening',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-8 border w-full max-w-6xl shadow-lg rounded-lg bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-gray-900">Student Dental Screening Form</h3>
          <Button variant="ghost" onClick={onClose}>
            ×
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Demographic Details */}
            <Card>
              <CardHeader>
                <CardTitle>Demographic Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {!studentId && (
                  <>
                    <FormField
                      control={form.control}
                      name="studentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Name (Full)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studentAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Age" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studentGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studentGrade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
                          <FormControl>
                            <Input placeholder="Grade/Class" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studentRollNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Roll No." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent/Guardian Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Parent/Guardian Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Email Address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentOccupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Occupation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Clinical Examination */}
            <Card>
              <CardHeader>
                <CardTitle>Clinical Examination Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dental Chart */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Teeth Present (Dental Chart)
                  </label>
                  <div className="mb-4 flex gap-4">
                    <div>
                      <label className="text-sm font-medium">Mark teeth as:</label>
                      <Select value={currentCondition} onValueChange={(value: ToothState['condition']) => setCurrentCondition(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="decayed">Decayed</SelectItem>
                          <SelectItem value="missing">Missing</SelectItem>
                          <SelectItem value="filled">Filled</SelectItem>
                          <SelectItem value="crowned">Crown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DentalChart
                    selectedTeeth={selectedTeeth}
                    onToothClick={handleToothClick}
                    mode={chartMode}
                    currentCondition={currentCondition}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="dentalAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dental Age</FormLabel>
                        <FormControl>
                          <Input placeholder="Dental age" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decayed Teeth Count
                    </label>
                    <Input 
                      type="number" 
                      value={form.watch('decayedTeethCount')}
                      readOnly 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Missing Teeth Count
                    </label>
                    <Input 
                      type="number" 
                      value={form.watch('missingTeethCount')}
                      readOnly 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filled Teeth Count
                    </label>
                    <Input 
                      type="number" 
                      value={form.watch('filledTeethCount')}
                      readOnly 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teeth with Crowns
                    </label>
                    <Input 
                      type="number" 
                      value={form.watch('crownedTeethCount')}
                      readOnly 
                      className="bg-gray-50"
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="stains"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stains</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="+">+ (Mild)</SelectItem>
                            <SelectItem value="++">++ (Moderate)</SelectItem>
                            <SelectItem value="+++">+++ (Severe)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="calculus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calculus</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="+">+ (Mild)</SelectItem>
                            <SelectItem value="++">++ (Moderate)</SelectItem>
                            <SelectItem value="+++">+++ (Severe)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="tongueExamination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tongue Examination</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Tongue examination findings" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="habits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Habits</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Thumb sucking, nail biting, etc." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Occlusion Section */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-md font-medium text-gray-900 mb-4">Occlusion & Bite Assessment</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cross Bite</label>
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="crossBiteUnilateral"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Unilateral
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crossBiteBilateral"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Bilateral
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crossBiteAnterior"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Anterior
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Open Bite</label>
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="openBiteAnterior"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Anterior
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="openBitePosteriorUnilateral"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Posterior Unilateral
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="openBitePosteriorBilateral"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Posterior Bilateral
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="canineRelationshipPrimary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Canine Relationship (Primary)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="class_i">Class I</SelectItem>
                                <SelectItem value="class_ii">Class II</SelectItem>
                                <SelectItem value="class_iii">Class III</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="molarRelationshipPrimary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Molar Relationship (Primary)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="class_i">Class I</SelectItem>
                                <SelectItem value="class_ii">Class II</SelectItem>
                                <SelectItem value="class_iii">Class III</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Trauma Section */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h5 className="text-md font-medium text-gray-900 mb-4">Trauma Assessment</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="traumaType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type of Fracture (Ellis Classification)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Ellis Class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="class_i">Class I - Enamel only</SelectItem>
                              <SelectItem value="class_ii">Class II - Enamel and dentin</SelectItem>
                              <SelectItem value="class_iii">Class III - Enamel, dentin and pulp</SelectItem>
                              <SelectItem value="class_iv">Class IV - Root fracture</SelectItem>
                              <SelectItem value="class_v">Class V - Avulsion</SelectItem>
                              <SelectItem value="class_vi">Class VI - Crown-root fracture</SelectItem>
                              <SelectItem value="class_vii">Class VII - Displacement without fracture</SelectItem>
                              <SelectItem value="class_viii">Class VIII - Crown fracture before completion</SelectItem>
                              <SelectItem value="class_ix">Class IX - Traumatic injury to primary teeth</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="traumaRootDevelopment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Root Development</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="immature">Immature</SelectItem>
                              <SelectItem value="mature">Mature</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="preventiveMeasures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prescriptive/Preventive Measures</FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={4} 
                          placeholder="Enter specific recommendations and preventive measures for the student..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createScreeningMutation.isPending || createStudentMutation.isPending}
              >
                {createScreeningMutation.isPending || createStudentMutation.isPending ? 'Saving...' : 'Complete Screening'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
