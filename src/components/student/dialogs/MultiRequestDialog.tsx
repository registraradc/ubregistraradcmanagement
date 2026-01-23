import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Minus } from 'lucide-react';
import { FormData } from '../RequestForm';

type RequestTypeKey = 'add' | 'add_with_exception' | 'change' | 'drop';

interface Course {
  courseCode: string;
  descriptiveTitle: string;
  sectionCode: string;
  time: string;
  day: string;
}

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

interface MultiRequestDialogProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  onSuccess: () => void;
}

const getReasonsForType = (type: RequestTypeKey | '') => {
  switch (type) {
    case 'add':
    case 'add_with_exception':
      return [
        'Grade unavailable during enlistment',
        'Prerequisite course marked NG during enlistment',
        'Underload – requesting additional units',
        'Course not offered during enlistment',
        'Schedule conflict resolved',
        'Graduation requirement',
        'Curriculum adjustment (newly added or reclassified course)',
        'Replacement for dropped/cancelled course',
        'Academic advisor recommendation',
        'Elective choice within allowed units',
        'Transfer credit evaluation pending',
        'Enrollment error during enlistment',
        'Repetition of a failed course',
        'Change in study plan/major',
      ];
    case 'change':
      return [
        'Schedule conflict with another required course',
        'Instructor or section change requested/approved',
        'Shift in academic track or major',
        'Academic Adviser/Dean recommendation for better progression',
        'Time/room adjustment for accessibility or personal circumstances',
        'Error correction in initial enlistment',
      ];
    case 'drop':
      return [
        'Course dissolved or cancelled by the department',
        'Schedule conflict unresolved',
        'Course repetition not needed (already passed via transfer/credit)',
        'Financial or scholarship unit limit compliance',
        'Academic advisor recommendation to lighten the load',
        'Course not required for graduation after curriculum review',
        'Instructor approval to withdraw',
        'Health or personal reasons',
        'Enrollment error correction',
      ];
    default:
      return [];
  }
};

const MultiRequestDialog = ({ open, onClose, formData, onSuccess }: MultiRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Record<RequestTypeKey, boolean>>({
    add: false,
    add_with_exception: false,
    change: false,
    drop: false,
  });

  const [reasonAdd, setReasonAdd] = useState('');
  const [reasonAddException, setReasonAddException] = useState('');
  const [reasonChange, setReasonChange] = useState('');
  const [reasonDrop, setReasonDrop] = useState('');

  const [addCount, setAddCount] = useState(1);
  const [addExCount, setAddExCount] = useState(1);
  const [dropCount, setDropCount] = useState(1);
  const [changeCount, setChangeCount] = useState(1);

  const [addCourses, setAddCourses] = useState<Course[]>([]);
  const [addExCourses, setAddExCourses] = useState<Course[]>([]);
  const [dropCourses, setDropCourses] = useState<Course[]>([]);
  const [oldCourses, setOldCourses] = useState<OldCourse[]>([]);
  const [newCourses, setNewCourses] = useState<NewCourse[]>([]);

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected({ add: false, add_with_exception: false, change: false, drop: false });
      setReasonAdd('');
      setReasonAddException('');
      setReasonChange('');
      setReasonDrop('');
      setAddCount(1);
      setAddExCount(1);
      setDropCount(1);
      setChangeCount(1);
      setAddCourses([]);
      setAddExCourses([]);
      setDropCourses([]);
      setOldCourses([]);
      setNewCourses([]);
    }
  }, [open]);

  const selectedTypes = useMemo(() => {
    return (Object.keys(selected) as RequestTypeKey[]).filter((k) => selected[k]);
  }, [selected]);

  const canSubmit = useMemo(() => {
    if (!user) return false;
    if (selectedTypes.length === 0) return false;
    const checks: boolean[] = [];
    if (selected.add) {
      const reasonOk = !!reasonAdd;
      const detailsOk = addCourses.length >= 1 && addCourses.every((c) => c.courseCode && c.descriptiveTitle && c.sectionCode && c.time && c.day);
      checks.push(reasonOk && detailsOk);
    }
    if (selected.add_with_exception) {
      const reasonOk = !!reasonAddException;
      const detailsOk = addExCourses.length >= 1 && addExCourses.every((c) => c.courseCode && c.descriptiveTitle && c.sectionCode && c.time && c.day);
      checks.push(reasonOk && detailsOk);
    }
    if (selected.drop) {
      const reasonOk = !!reasonDrop;
      const detailsOk = dropCourses.length >= 1 && dropCourses.every((c) => c.courseCode && c.descriptiveTitle && c.sectionCode && c.time && c.day);
      checks.push(reasonOk && detailsOk);
    }
    if (selected.change) {
      const reasonOk = !!reasonChange;
      const detailsOk =
        oldCourses.length >= 1 &&
        newCourses.length >= 1 &&
        oldCourses.length === newCourses.length &&
        oldCourses.every((c) => c.courseCode) &&
        newCourses.every((c) => c.courseCode && c.descriptiveTitle && c.sectionCode && c.time && c.day);
      checks.push(reasonOk && detailsOk);
    }
    return checks.length > 0 && checks.every(Boolean);
  }, [user, selected, selectedTypes, reasonAdd, reasonAddException, reasonChange, reasonDrop, addCourses, dropCourses, oldCourses, newCourses]);

  const handleToggle = (key: RequestTypeKey, value: boolean) => {
    setSelected((prev) => ({ ...prev, [key]: value }));
  };

  const ensureArrayLength = <T,>(len: number, setter: Dispatch<SetStateAction<T[]>>, template: T) => {
    const arr = Array(len)
      .fill(null)
      .map(() => ({ ...template }));
    setter(arr);
  };

  const handlePrepareAdd = () => {
    ensureArrayLength(addCount, setAddCourses, {
      courseCode: '',
      descriptiveTitle: '',
      sectionCode: '',
      time: '',
      day: '',
    });
  };

  const handlePrepareDrop = () => {
    ensureArrayLength(dropCount, setDropCourses, {
      courseCode: '',
      descriptiveTitle: '',
      sectionCode: '',
      time: '',
      day: '',
    });
  };

  const handlePrepareAddException = () => {
    ensureArrayLength(addExCount, setAddExCourses, {
      courseCode: '',
      descriptiveTitle: '',
      sectionCode: '',
      time: '',
      day: '',
    });
  };

  const handlePrepareChange = () => {
    const olds = Array(changeCount).fill(null).map(() => ({ courseCode: '' }));
    const news = Array(changeCount).fill(null).map(() => ({
      courseCode: '',
      descriptiveTitle: '',
      sectionCode: '',
      time: '',
      day: '',
    }));
    setOldCourses(olds);
    setNewCourses(news);
  };

  const updateCourse = <T,>(
    setter: Dispatch<SetStateAction<T[]>>,
    arr: T[],
    index: number,
    field: keyof T,
    value: string,
  ) => {
    const copy = [...arr];
    copy[index] = { ...(copy[index] as unknown as Record<string, unknown>), [field as string]: value } as T;
    setter(copy);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      toast({
        title: 'Incomplete Information',
        description: 'Fill in details and reasons for all selected types.',
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
      const typeList = selectedTypes;
      const { data: existing } = await supabase
        .from('requests')
        .select('id, request_type, status')
        .eq('user_id', user.id)
        .in('request_type', typeList)
        .in('status', ['pending', 'processing']);

      const existingTypes = new Set<RequestTypeKey>(
        ((existing as Array<{ request_type: RequestTypeKey }> | null) || []).map((r) => r.request_type),
      );
      const toInsert = [];

      if (selected.add && !existingTypes.has('add')) {
        toInsert.push({
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
          request_type: 'add' as const,
          request_data: JSON.parse(JSON.stringify({ courses: addCourses, reason: reasonAdd })),
        });
      }

      if (selected.add_with_exception && !existingTypes.has('add_with_exception')) {
        toInsert.push({
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
          request_data: JSON.parse(JSON.stringify({ courses: addExCourses, reason: reasonAddException })),
        });
      }

      if (selected.drop && !existingTypes.has('drop')) {
        toInsert.push({
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
          request_type: 'drop' as const,
          request_data: JSON.parse(JSON.stringify({ courses: dropCourses, reason: reasonDrop })),
        });
      }

      if (selected.change && !existingTypes.has('change')) {
        toInsert.push({
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
          request_data: JSON.parse(JSON.stringify({ oldCourses, newCourses, reason: reasonChange })),
        });
      }

      if (toInsert.length === 0) {
        toast({
          title: 'No Requests Submitted',
          description: 'Existing pending or processing requests block duplicates.',
          variant: 'destructive',
        });
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      const { error } = await supabase.from('requests').insert(toInsert);
      if (error) throw error;

      const submittedCount = toInsert.length;
      const skipped = selectedTypes.filter((t) => existingTypes.has(t));
      const msg =
        skipped.length > 0
          ? `Submitted ${submittedCount} request(s). Skipped: ${skipped.join(', ')}.`
          : `Submitted ${submittedCount} request(s).`;
      toast({
        title: 'Requests Submitted',
        description: msg,
      });

      setShowConfirm(false);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Submission failed';
      toast({
        title: 'Submission Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Combined Request Submission</DialogTitle>
            <DialogDescription>
              Select application types and provide details for each. All will be queued together.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.add}
                  onCheckedChange={(v) => handleToggle('add', !!v)}
                  id="chk-add"
                />
                <Label htmlFor="chk-add">Add Course</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.add_with_exception}
                  onCheckedChange={(v) => handleToggle('add_with_exception', !!v)}
                  id="chk-add-ex"
                />
                <div className="flex flex-col">
                  <Label htmlFor="chk-add-ex">Add with Exception</Label>
                  <span className="text-xs text-red-600">Requires meeting the Registrar.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.change}
                  onCheckedChange={(v) => handleToggle('change', !!v)}
                  id="chk-change"
                />
                <Label htmlFor="chk-change">Change Course</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.drop}
                  onCheckedChange={(v) => handleToggle('drop', !!v)}
                  id="chk-drop"
                />
                <Label htmlFor="chk-drop">Drop Course</Label>
              </div>
            </div>

            {selected.add && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Reason (Add Course)</Label>
                      <Select value={reasonAdd} onValueChange={setReasonAdd}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {getReasonsForType('add').map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of courses (Add Course)</Label>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => setAddCount((c) => Math.max(1, c - 1))} disabled={addCount <= 1}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-2xl font-bold w-16 text-center">{addCount}</span>
                        <Button variant="outline" size="icon" onClick={() => setAddCount((c) => c + 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" className="hover:bg-accent hover:text-accent-foreground" onClick={handlePrepareAdd}>Set</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {addCourses.map((course, index) => (
                      <Card key={`add-${index}`} className="overflow-hidden">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-blue-600 mb-3">Add Course {index + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Course Code</Label>
                              <Input
                                placeholder="e.g., CWorld"
                                value={course.courseCode}
                                onChange={(e) => updateCourse(setAddCourses, addCourses, index, 'courseCode', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Descriptive Title</Label>
                              <Input
                                placeholder="e.g., The Contemporary World"
                                value={course.descriptiveTitle}
                                onChange={(e) => updateCourse(setAddCourses, addCourses, index, 'descriptiveTitle', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Section Code</Label>
                              <Input
                                placeholder="e.g., T241"
                                value={course.sectionCode}
                                onChange={(e) => updateCourse(setAddCourses, addCourses, index, 'sectionCode', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Time</Label>
                              <Input
                                placeholder="e.g., 7:30-9:00 AM"
                                value={course.time}
                                onChange={(e) => updateCourse(setAddCourses, addCourses, index, 'time', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">Day</Label>
                              <Input
                                placeholder="e.g., MWF/TTH"
                                value={course.day}
                                onChange={(e) => updateCourse(setAddCourses, addCourses, index, 'day', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selected.add_with_exception && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Reason (Add with Exception)</Label>
                      <Select value={reasonAddException} onValueChange={setReasonAddException}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {getReasonsForType('add_with_exception').map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of courses (Add with Exception)</Label>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => setAddExCount((c) => Math.max(1, c - 1))} disabled={addExCount <= 1}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-2xl font-bold w-16 text-center">{addExCount}</span>
                        <Button variant="outline" size="icon" onClick={() => setAddExCount((c) => c + 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" className="hover:bg-accent hover:text-accent-foreground" onClick={handlePrepareAddException}>Set</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {addExCourses.map((course, index) => (
                      <Card key={`addex-${index}`} className="overflow-hidden">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-blue-600 mb-3">Add with Exception {index + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Course Code</Label>
                              <Input
                                placeholder="e.g., CWorld"
                                value={course.courseCode}
                                onChange={(e) => updateCourse(setAddExCourses, addExCourses, index, 'courseCode', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Descriptive Title</Label>
                              <Input
                                placeholder="e.g., The Contemporary World"
                                value={course.descriptiveTitle}
                                onChange={(e) => updateCourse(setAddExCourses, addExCourses, index, 'descriptiveTitle', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Section Code</Label>
                              <Input
                                placeholder="e.g., T241"
                                value={course.sectionCode}
                                onChange={(e) => updateCourse(setAddExCourses, addExCourses, index, 'sectionCode', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Time</Label>
                              <Input
                                placeholder="e.g., 7:30-9:00 AM"
                                value={course.time}
                                onChange={(e) => updateCourse(setAddExCourses, addExCourses, index, 'time', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">Day</Label>
                              <Input
                                placeholder="e.g., MWF/TTH"
                                value={course.day}
                                onChange={(e) => updateCourse(setAddExCourses, addExCourses, index, 'day', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selected.drop && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Reason (Drop Course)</Label>
                      <Select value={reasonDrop} onValueChange={setReasonDrop}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {getReasonsForType('drop').map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of courses (Drop Course)</Label>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => setDropCount((c) => Math.max(1, c - 1))} disabled={dropCount <= 1}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-2xl font-bold w-16 text-center">{dropCount}</span>
                        <Button variant="outline" size="icon" onClick={() => setDropCount((c) => c + 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" className="hover:bg-accent hover:text-accent-foreground" onClick={handlePrepareDrop}>Set</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {dropCourses.map((course, index) => (
                      <Card key={`drop-${index}`} className="overflow-hidden">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-blue-600 mb-3">Drop Course {index + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Course Code</Label>
                              <Input
                                placeholder="e.g., CWorld"
                                value={course.courseCode}
                                onChange={(e) => updateCourse(setDropCourses, dropCourses, index, 'courseCode', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Descriptive Title</Label>
                              <Input
                                placeholder="e.g., The Contemporary World"
                                value={course.descriptiveTitle}
                                onChange={(e) => updateCourse(setDropCourses, dropCourses, index, 'descriptiveTitle', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Section Code</Label>
                              <Input
                                placeholder="e.g., T241"
                                value={course.sectionCode}
                                onChange={(e) => updateCourse(setDropCourses, dropCourses, index, 'sectionCode', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Time</Label>
                              <Input
                                placeholder="e.g., 7:30-9:00 AM"
                                value={course.time}
                                onChange={(e) => updateCourse(setDropCourses, dropCourses, index, 'time', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">Day</Label>
                              <Input
                                placeholder="e.g., MWF/TTH"
                                value={course.day}
                                onChange={(e) => updateCourse(setDropCourses, dropCourses, index, 'day', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selected.change && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Reason (Change Course)</Label>
                      <Select value={reasonChange} onValueChange={setReasonChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {getReasonsForType('change').map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of course changes (Change Course)</Label>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => setChangeCount((c) => Math.max(1, c - 1))} disabled={changeCount <= 1}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-2xl font-bold w-16 text-center">{changeCount}</span>
                        <Button variant="outline" size="icon" onClick={() => setChangeCount((c) => c + 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" className="hover:bg-accent hover:text-accent-foreground" onClick={handlePrepareChange}>Set</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: Math.max(oldCourses.length, newCourses.length) }).map((_, index) => (
                      <Card key={`chg-${index}`} className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <p className="text-sm font-medium text-blue-600">Change Pair {index + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Old Course Code</Label>
                              <Input
                                placeholder="e.g., CWorld"
                                value={oldCourses[index]?.courseCode || ''}
                                onChange={(e) =>
                                  updateCourse(setOldCourses, oldCourses, index, 'courseCode', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">New Course Code</Label>
                              <Input
                                placeholder="e.g., CWorld"
                                value={newCourses[index]?.courseCode || ''}
                                onChange={(e) =>
                                  updateCourse(setNewCourses, newCourses, index, 'courseCode', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Descriptive Title</Label>
                              <Input
                                placeholder="e.g., The Contemporary World"
                                value={newCourses[index]?.descriptiveTitle || ''}
                                onChange={(e) =>
                                  updateCourse(setNewCourses, newCourses, index, 'descriptiveTitle', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Section Code</Label>
                              <Input
                                placeholder="e.g., T241"
                                value={newCourses[index]?.sectionCode || ''}
                                onChange={(e) =>
                                  updateCourse(setNewCourses, newCourses, index, 'sectionCode', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Time</Label>
                              <Input
                                placeholder="e.g., 7:30-9:00 AM"
                                value={newCourses[index]?.time || ''}
                                onChange={(e) =>
                                  updateCourse(setNewCourses, newCourses, index, 'time', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">Day</Label>
                              <Input
                                placeholder="e.g., MWF/TTH"
                                value={newCourses[index]?.day || ''}
                                onChange={(e) =>
                                  updateCourse(setNewCourses, newCourses, index, 'day', e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter className="mt-2 gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Submit ${selectedTypes.length} Request(s)`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Requests will be created for all selected types. Proceed?
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

export default MultiRequestDialog;
