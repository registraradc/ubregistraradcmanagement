import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FormData } from '../RequestForm';
import { Loader2, Plus, Minus } from 'lucide-react';

interface ChangeYearLevelDialogProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  onSuccess: () => void;
}

const ChangeYearLevelDialog = ({ open, onClose, formData, onSuccess }: ChangeYearLevelDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentYearLevel, setCurrentYearLevel] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleYearChange = (delta: number) => {
    const newLevel = Math.min(5, Math.max(1, currentYearLevel + delta));
    setCurrentYearLevel(newLevel);
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for the year level change.',
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
        request_type: 'change_year_level' as const,
        request_data: JSON.parse(JSON.stringify({ currentYearLevel, reason })),
      }]);

      if (error) throw error;

      toast({
        title: 'Request Submitted!',
        description: 'Your change year level request has been queued.',
      });
      resetDialog();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message.includes('unique constraint') 
          ? 'You already have a pending Change Year Level request. Please wait for it to be processed.' 
          : error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const resetDialog = () => {
    setCurrentYearLevel(1);
    setReason('');
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Year Level Request</DialogTitle>
            <DialogDescription>
              Enter your current year level and reason for change
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div>
              <Label className="text-center block mb-4">Current Year Level</Label>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={() => handleYearChange(-1)} disabled={currentYearLevel <= 1}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-bold w-16 text-center">{currentYearLevel}</span>
                <Button variant="outline" size="icon" onClick={() => handleYearChange(1)} disabled={currentYearLevel >= 5}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">
                Year Level Range: 1-5
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Request *</Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you are requesting to change your year level..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none input-focus"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this change year level request? Please verify all details are correct.
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

export default ChangeYearLevelDialog;
