import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FormData } from '../RequestForm';
import { Loader2, Plus, Minus } from 'lucide-react';

interface Course {
  courseCode: string;
  descriptiveTitle: string;
  sectionCode: string;
  time: string;
  day: string;
}

interface AddRequestExceptionDialogProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  onSuccess: () => void;
}

const AddRequestExceptionDialog = ({ open, onClose, formData, onSuccess }: AddRequestExceptionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [courseCount, setCourseCount] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCountChange = (delta: number) => {
    const newCount = Math.max(1, courseCount + delta);
    setCourseCount(newCount);
  };

  const handleNext = () => {
    const newCourses = Array(courseCount).fill(null).map(() => ({
      courseCode: '',
      descriptiveTitle: '',
      sectionCode: '',
      time: '',
      day: '',
    }));
    setCourses(newCourses);
    setStep(2);
  };

  const updateCourse = (index: number, field: keyof Course, value: string) => {
    setCourses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = () => {
    const isValid = courses.every(c => c.courseCode && c.descriptiveTitle && c.sectionCode && c.time && c.day);
    if (!isValid) {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill in all course details.',
        variant: 'destructive',
      });
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: existingRequest } = await supabase
        .from('requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('request_type', 'add_with_exception')
        .in('status', ['pending', 'processing'])
        .single();

      if (existingRequest) {
        toast({
          title: 'Request Already Exists',
          description: 'You already have a pending or processing Add Course with Exception request.',
          variant: 'destructive',
        });
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      const { error } = await supabase.from('requests').insert([{
        user_id: user.id,
        id_number: formData.idNumber,
        college: formData.college,
        program: formData.program,
        last_name: formData.lastName,
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        suffix: formData.suffix || null,
        email: formData.email,
        phone_number: formData.phoneNumber,
        facebook: formData.facebook || null,
        request_type: 'add_with_exception' as const,
        request_data: JSON.parse(JSON.stringify({ courses })),
      }]);

      if (error) throw error;

      toast({
        title: 'Request Submitted!',
        description: (
          <span className="text-red-600">
            Please see the Registrar.
          </span>
        ),
      });
      resetDialog();
      onSuccess();
      setShowConfirm(false);
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setCourseCount(1);
    setCourses([]);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Course with Exception</DialogTitle>
            <DialogDescription>
              {step === 1 ? 'How many courses do you want to add?' : 'Enter the course details'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="py-6">
              <Label className="text-center block mb-4">Number of courses to add</Label>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={() => handleCountChange(-1)} disabled={courseCount <= 1}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-bold w-16 text-center">{courseCount}</span>
                <Button variant="outline" size="icon" onClick={() => handleCountChange(1)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleNext}>Next</Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="py-4">
              <div className="space-y-4">
                {courses.map((course, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Course {index + 1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Course Code</Label>
                          <Input
                            placeholder="e.g., CWorld"
                            value={course.courseCode}
                            onChange={(e) => updateCourse(index, 'courseCode', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descriptive Title</Label>
                          <Input
                            placeholder="e.g., The Contemporary World"
                            value={course.descriptiveTitle}
                            onChange={(e) => updateCourse(index, 'descriptiveTitle', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Section Code</Label>
                          <Input
                            placeholder="e.g., T241"
                            value={course.sectionCode}
                            onChange={(e) => updateCourse(index, 'sectionCode', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Time</Label>
                          <Input
                            placeholder="e.g., 7:30-9:00 AM"
                            value={course.time}
                            onChange={(e) => updateCourse(index, 'time', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Day</Label>
                          <Input
                            placeholder="e.g., MWF/TTH"
                            value={course.day}
                            onChange={(e) => updateCourse(index, 'day', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this add course with exception request? Please verify all details are correct.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddRequestExceptionDialog;
