import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { colleges, getProgramsByCollege } from '@/lib/colleges';
import { Loader2, Plus, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RequestTypeKey = 'add' | 'add_with_exception' | 'change' | 'drop';

interface Course {
  courseCode?: string;
  descriptiveTitle?: string;
  sectionCode?: string;
  time?: string;
  day?: string;
}

interface OldCourse {
  courseCode?: string;
}

interface NewCourse {
  courseCode?: string;
  descriptiveTitle?: string;
  sectionCode?: string;
  time?: string;
  day?: string;
}

interface RequestData {
  reason?: string;
  courses?: Course[];
  oldCourses?: Array<OldCourse>;
  newCourses?: Array<NewCourse>;
}

interface Request {
  id: string;
  request_type: RequestTypeKey | 'change_year_level';
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'partially_approved';
  remarks: string | null;
  created_at: string;
  completed_at: string | null;
  request_data: RequestData;
  id_number: string;
  college: string;
  program: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  suffix: string | null;
  email: string;
  phone_number: string;
  facebook: string | null;
}

interface EditRequestDialogProps {
  open: boolean;
  onClose: () => void;
  request: Request;
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

const EditRequestDialog = ({ open, onClose, request, onSuccess }: EditRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [idNumber, setIdNumber] = useState(request.id_number ?? '');
  const [college, setCollege] = useState(request.college ?? '');
  const [program, setProgram] = useState(request.program ?? '');
  const [lastName, setLastName] = useState(request.last_name ?? '');
  const [firstName, setFirstName] = useState(request.first_name ?? '');
  const [middleName, setMiddleName] = useState(request.middle_name ?? '');
  const [suffix, setSuffix] = useState(request.suffix ?? '');
  const [email, setEmail] = useState(request.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(request.phone_number ?? '');
  const [facebook, setFacebook] = useState(request.facebook ?? '');
  const [requestType, setRequestType] = useState<RequestTypeKey>(
    (request.request_type === 'change_year_level' ? 'add' : request.request_type) as RequestTypeKey
  );
  const [reason, setReason] = useState(request.request_data?.reason ?? '');

  const [courseCount, setCourseCount] = useState<number>(
    request.request_type === 'change'
      ? Math.max(request.request_data?.newCourses?.length ?? 0, request.request_data?.oldCourses?.length ?? 0) || 1
      : (request.request_data?.courses?.length ?? 0) || 1
  );
  const [courses, setCourses] = useState<Course[]>(
    (request.request_data?.courses ?? []).map((c) => ({
      courseCode: c.courseCode ?? '',
      descriptiveTitle: c.descriptiveTitle ?? '',
      sectionCode: c.sectionCode ?? '',
      time: c.time ?? '',
      day: c.day ?? '',
    }))
  );
  const [oldCourses, setOldCourses] = useState<OldCourse[]>(
    (request.request_data?.oldCourses ?? []).map((c) => ({ courseCode: c.courseCode ?? '' }))
  );
  const [newCourses, setNewCourses] = useState<NewCourse[]>(
    (request.request_data?.newCourses ?? []).map((c) => ({
      courseCode: c.courseCode ?? '',
      descriptiveTitle: c.descriptiveTitle ?? '',
      sectionCode: c.sectionCode ?? '',
      time: c.time ?? '',
      day: c.day ?? '',
    }))
  );

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      const programs = getProgramsByCollege(college);
      if (programs.length > 0 && !programs.includes(program)) {
        setProgram('');
      }
    }
  }, [open, college, program]);

  const programs = useMemo(() => getProgramsByCollege(college), [college]);

  useEffect(() => {
    if (requestType === 'change') {
      const len = Math.max(oldCourses.length || 0, newCourses.length || 0, courseCount || 1);
      const ensureOld = Array(len)
        .fill(null)
        .map((_, i) => ({ courseCode: oldCourses[i]?.courseCode ?? '' }));
      const ensureNew = Array(len)
        .fill(null)
        .map((_, i) => ({
          courseCode: newCourses[i]?.courseCode ?? '',
          descriptiveTitle: newCourses[i]?.descriptiveTitle ?? '',
          sectionCode: newCourses[i]?.sectionCode ?? '',
          time: newCourses[i]?.time ?? '',
          day: newCourses[i]?.day ?? '',
        }));
      setOldCourses(ensureOld);
      setNewCourses(ensureNew);
      setCourseCount(len);
    } else {
      const len = Math.max(courses.length || 0, courseCount || 1);
      const ensure = Array(len)
        .fill(null)
        .map((_, i) => ({
          courseCode: courses[i]?.courseCode ?? '',
          descriptiveTitle: courses[i]?.descriptiveTitle ?? '',
          sectionCode: courses[i]?.sectionCode ?? '',
          time: courses[i]?.time ?? '',
          day: courses[i]?.day ?? '',
        }));
      setCourses(ensure);
      setCourseCount(len);
    }
  }, [requestType]);

  const handleCourseCountChange = (delta: number) => {
    const newCount = Math.max(1, courseCount + delta);
    setCourseCount(newCount);
    if (requestType === 'change') {
      const ensureOld = Array(newCount)
        .fill(null)
        .map((_, i) => ({ courseCode: oldCourses[i]?.courseCode ?? '' }));
      const ensureNew = Array(newCount)
        .fill(null)
        .map((_, i) => ({
          courseCode: newCourses[i]?.courseCode ?? '',
          descriptiveTitle: newCourses[i]?.descriptiveTitle ?? '',
          sectionCode: newCourses[i]?.sectionCode ?? '',
          time: newCourses[i]?.time ?? '',
          day: newCourses[i]?.day ?? '',
        }));
      setOldCourses(ensureOld);
      setNewCourses(ensureNew);
    } else {
      const ensure = Array(newCount)
        .fill(null)
        .map((_, i) => ({
          courseCode: courses[i]?.courseCode ?? '',
          descriptiveTitle: courses[i]?.descriptiveTitle ?? '',
          sectionCode: courses[i]?.sectionCode ?? '',
          time: courses[i]?.time ?? '',
          day: courses[i]?.day ?? '',
        }));
      setCourses(ensure);
    }
  };

  const updateCourse = (index: number, field: keyof Course, value: string) => {
    setCourses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOldCourse = (index: number, value: string) => {
    setOldCourses((prev) => {
      const updated = [...prev];
      updated[index] = { courseCode: value };
      return updated;
    });
  };

  const updateNewCourse = (index: number, field: keyof NewCourse, value: string) => {
    setNewCourses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'approved':
        return 'status-approved';
      case 'partially_approved':
        return 'status-partially-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const isValidPersonal = () => {
    return (
      !!idNumber &&
      !!college &&
      !!program &&
      !!lastName &&
      !!firstName &&
      !!email &&
      !!phoneNumber
    );
  };

  const isValidDetails = () => {
    if (!reason) return false;
    if (requestType === 'change') {
      if (oldCourses.length < 1 || newCourses.length < 1 || oldCourses.length !== newCourses.length) return false;
      const oldOk = oldCourses.every((c) => !!c.courseCode);
      const newOk = newCourses.every(
        (c) => !!c.courseCode && !!c.descriptiveTitle && !!c.sectionCode && !!c.time && !!c.day
      );
      return oldOk && newOk;
    }
    if (courses.length < 1) return false;
    return courses.every((c) => !!c.courseCode && !!c.descriptiveTitle && !!c.sectionCode && !!c.time && !!c.day);
  };

  const handleSave = () => {
    if (!isValidPersonal() || !isValidDetails()) {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: duplicate } = await supabase
        .from('requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('request_type', requestType)
        .in('status', ['pending', 'processing'])
        .neq('id', request.id)
        .single();

      if (duplicate) {
        toast({
          title: 'Duplicate Request Type',
          description: 'You already have another request of this type pending or processing.',
          variant: 'destructive',
        });
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      const payload =
        requestType === 'change'
          ? { oldCourses, newCourses, reason }
          : { courses, reason };

      const { error } = await supabase
        .from('requests')
        .update({
          id_number: idNumber,
          college,
          program,
          last_name: lastName,
          first_name: firstName,
          middle_name: middleName || null,
          suffix: suffix || null,
          email,
          phone_number: phoneNumber,
          facebook: facebook || null,
          request_type: requestType,
          request_data: JSON.parse(JSON.stringify(payload)),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Changes Saved',
        description: 'Your pending request has been updated.',
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Update failed';
      toast({
        title: 'Update Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pending Request</DialogTitle>
            <DialogDescription>
              Update your request details. Queue number will be preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="input-focus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-focus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">College *</Label>
                <Select value={college} onValueChange={(v) => setCollege(v)}>
                  <SelectTrigger className="input-focus">
                    <SelectValue placeholder="Select college" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => (
                      <SelectItem key={c.abbreviation} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="program">Program *</Label>
                <Select value={program} onValueChange={(v) => setProgram(v)} disabled={!college}>
                  <SelectTrigger className="input-focus">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-focus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-focus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="input-focus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <Input id="suffix" value={suffix} onChange={(e) => setSuffix(e.target.value)} className="input-focus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="input-focus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} className="input-focus" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Request Type *</Label>
              <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestTypeKey)}>
                <SelectTrigger className="input-focus">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Course</SelectItem>
                  <SelectItem value="add_with_exception">Add Course with Exception</SelectItem>
                  <SelectItem value="change">Change Course</SelectItem>
                  <SelectItem value="drop">Drop Course</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={(v) => setReason(v)}>
                <SelectTrigger className="input-focus">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {getReasonsForType(requestType).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requestType !== 'change' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Number of courses</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleCourseCountChange(-1)} disabled={courseCount <= 1}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-bold w-12 text-center">{courseCount}</span>
                    <Button variant="outline" size="icon" onClick={() => handleCourseCountChange(1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {courses.map((course, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-blue-600 mb-3">Course {index + 1}</p>
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
              </div>
            )}

            {requestType === 'change' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Number of course pairs</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleCourseCountChange(-1)} disabled={courseCount <= 1}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-bold w-12 text-center">{courseCount}</span>
                    <Button variant="outline" size="icon" onClick={() => handleCourseCountChange(1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {Array(courseCount)
                    .fill(null)
                    .map((_, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-blue-600 mb-3">Pair {index + 1}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <p className="text-sm font-medium">From</p>
                              <div className="space-y-1">
                                <Label className="text-xs">Course Code</Label>
                                <Input
                                  placeholder="e.g., CWorld"
                                  value={oldCourses[index]?.courseCode ?? ''}
                                  onChange={(e) => updateOldCourse(index, e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <p className="text-sm font-medium">To</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Course Code</Label>
                                  <Input
                                    placeholder="e.g., CWorld"
                                    value={newCourses[index]?.courseCode ?? ''}
                                    onChange={(e) => updateNewCourse(index, 'courseCode', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Descriptive Title</Label>
                                  <Input
                                    placeholder="e.g., The Contemporary World"
                                    value={newCourses[index]?.descriptiveTitle ?? ''}
                                    onChange={(e) => updateNewCourse(index, 'descriptiveTitle', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Section Code</Label>
                                  <Input
                                    placeholder="e.g., T241"
                                    value={newCourses[index]?.sectionCode ?? ''}
                                    onChange={(e) => updateNewCourse(index, 'sectionCode', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Time</Label>
                                  <Input
                                    placeholder="e.g., 7:30-9:00 AM"
                                    value={newCourses[index]?.time ?? ''}
                                    onChange={(e) => updateNewCourse(index, 'time', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-xs">Day</Label>
                                  <Input
                                    placeholder="e.g., MWF/TTH"
                                    value={newCourses[index]?.day ?? ''}
                                    onChange={(e) => updateNewCourse(index, 'day', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes to your pending request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditRequestDialog;
