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
import { Loader2, Plus, Minus, ArrowRight } from 'lucide-react';

interface OldCourse {
  courseCode: string;
}

interface NewCourse {
  courseCode: string;
  descriptiveTitle: string;
  sectionCode: string;
  time: string;
  day: string;
}

interface ChangeRequestDialogProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  onSuccess: () => void;
}

const ChangeRequestDialog = ({ open, onClose, formData, onSuccess }: ChangeRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [courseCount, setCourseCount] = useState(1);
  const [oldCourses, setOldCourses] = useState<OldCourse[]>([]);
  const [newCourses, setNewCourses] = useState<NewCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCountChange = (delta: number) => {
    const newCount = Math.max(1, courseCount + delta);
    setCourseCount(newCount);
  };

  const handleNextToOld = () => {
    const old = Array(courseCount).fill(null).map(() => ({ courseCode: '' }));
    setOldCourses(old);
    setStep(2);
  };

  const handleNextToNew = () => {
    const isValid = oldCourses.every(c => c.courseCode);
    if (!isValid) {
      toast({
        title: 'Incomplete Information',
        description: 'Please enter all course codes.',
        variant: 'destructive',
      });
      return;
    }
    const newC = Array(courseCount).fill(null).map(() => ({
      courseCode: '',
      descriptiveTitle: '',
      sectionCode: '',
      time: '',
      day: '',
    }));
    setNewCourses(newC);
    setStep(3);
  };

  const updateOldCourse = (index: number, value: string) => {
    setOldCourses(prev => {
      const updated = [...prev];
      updated[index] = { courseCode: value };
      return updated;
    });
  };

  const updateNewCourse = (index: number, field: keyof NewCourse, value: string) => {
    setNewCourses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = () => {
    const isValid = newCourses.every(c => c.courseCode && c.descriptiveTitle && c.sectionCode && c.time && c.day);
    if (!isValid) {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill in all new course details.',
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
      // Check if user already has a pending or processing request of this type
      const { data: existingRequest } = await supabase
        .from('requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('request_type', 'change')
        .in('status', ['pending', 'processing'])
        .single();

      if (existingRequest) {
        toast({
          title: 'Request Already Exists',
          description: 'You already have a pending or processing Change request. Please wait for it to be completed.',
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
        request_type: 'change' as const,
        request_data: JSON.parse(JSON.stringify({ oldCourses, newCourses })),
      }]);

      if (error) throw error;

      toast({
        title: 'Request Submitted!',
        description: 'Your change course request has been queued.',
      });
      resetDialog();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setCourseCount(1);
    setOldCourses([]);
    setNewCourses([]);
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
            <DialogTitle>Change Course Request</DialogTitle>
            <DialogDescription>
              {step === 1 && 'How many courses do you want to change?'}
              {step === 2 && 'Enter the course codes you want to change'}
              {step === 3 && 'Enter the new course details'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="py-6">
              <Label className="text-center block mb-4">Number of courses to change</Label>
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
                <Button onClick={handleNextToOld}>Next</Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Enter the course codes of the courses you want to change:
              </p>
              <div className="space-y-3">
                {oldCourses.map((course, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-8">{index + 1}.</span>
                    <Input
                      placeholder="PATHFit 1"
                      value={course.courseCode}
                      onChange={(e) => updateOldCourse(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleNextToNew}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Enter the new courses to replace the old ones:
              </p>
              <div className="space-y-4">
                {newCourses.map((course, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">
                        Replacing: <span className="text-foreground">{oldCourses[index]?.courseCode}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">New Course Code</Label>
                          <Input
                            placeholder="Lit 1N"
                            value={course.courseCode}
                            onChange={(e) => updateNewCourse(index, 'courseCode', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descriptive Title</Label>
                          <Input
                            placeholder="Philippine Literature"
                            value={course.descriptiveTitle}
                            onChange={(e) => updateNewCourse(index, 'descriptiveTitle', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Section Code</Label>
                          <Input
                            placeholder="e.g., T241"
                            value={course.sectionCode}
                            onChange={(e) => updateNewCourse(index, 'sectionCode', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Time</Label>
                          <Input
                            placeholder="e.g., 7:30-9:00 AM"
                            value={course.time}
                            onChange={(e) => updateNewCourse(index, 'time', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Day</Label>
                          <Input
                            placeholder="e.g., MWF/TTH"
                            value={course.day}
                            onChange={(e) => updateNewCourse(index, 'day', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
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
              Are you sure you want to submit this change course request? Please verify all details are correct.
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

export default ChangeRequestDialog;
