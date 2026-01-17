import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Clock, Settings, Play, CheckCircle, XCircle, FileText, User } from 'lucide-react';

interface Request {
  id: string;
  user_id: string;
  request_type: 'add' | 'add_with_exception' | 'change' | 'drop' | 'change_year_level';
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  remarks: string | null;
  created_at: string;
  processed_at: string | null;
  completed_at: string | null;
  request_data: any;
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

const RequestQueue = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [selectedRejectReason, setSelectedRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const getRejectReasons = (type: Request['request_type']) => {
    switch (type) {
      case 'add':
      case 'add_with_exception':
        return [
          'Exceeds unit load',
          'Course full',
          'Prerequisite not met',
          'Grade pending',
          'Not in the curriculum',
          'Deadline passed',
          'Schedule conflict',
          'Scholarship/financial restriction',
          'No approval',
          'Duplicate enrollment',
        ];
      case 'change':
        return [
          'Section full',
          'Schedule conflict',
          'Exceeds unit load',
          'Part of a block section',
          'Not offered this term',
          'Deadline passed',
          'No approval',
          'Curriculum restriction',
          'Overload/underload issue',
          'Not applicable',
        ];
      case 'drop':
        return [
          'Below minimum load',
          'Required for graduation',
          'Scholarship/financial restriction',
          'No approval',
          'Part of a block section',
          'Drop limit exceeded',
          'Policy restriction',
          'Deadline passed',
          'Not applicable',
        ];
      default:
        return [];
    }
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['pending', 'processing'])
      .neq('request_type', 'change_year_level')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching requests:', error);
    } else {
      setRequests(data as Request[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('staff-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Settings className="w-4 h-4 animate-spin" />;
      default:
        return null;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'add':
        return 'Add Course';
      case 'add_with_exception':
        return 'Add Course with Exception';
      case 'change':
        return 'Change Course';
      case 'drop':
        return 'Drop Course';
      default:
        return type;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      default:
        return '';
    }
  };

  const handleStartProcess = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    const { error } = await supabase
      .from('requests')
      .update({ 
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to start processing.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Processing Started',
        description: 'The student has been notified.',
      });
      setSelectedRequest({ ...selectedRequest, status: 'processing' });
      fetchRequests();
    }
    setProcessing(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    const { error } = await supabase
      .from('requests')
      .update({ 
        status: 'approved',
        completed_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve request.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Request Approved',
        description: 'The student has been notified.',
      });
      setShowDetails(false);
      setShowApproveConfirm(false);
      fetchRequests();
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    const trimmedRemarks = rejectRemarks.trim();
    if (!trimmedRemarks && !selectedRejectReason) return;
    const finalRemarks = selectedRejectReason
      ? trimmedRemarks
        ? `${selectedRejectReason} - ${trimmedRemarks}`
        : selectedRejectReason
      : trimmedRemarks;
    
    setProcessing(true);
    const { error } = await supabase
      .from('requests')
      .update({ 
        status: 'rejected',
        remarks: finalRemarks,
        completed_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Request Rejected',
        description: 'The student has been notified.',
      });
      setShowDetails(false);
      setShowRejectDialog(false);
      setRejectRemarks('');
      setSelectedRejectReason('');
      fetchRequests();
    }
    setProcessing(false);
  };

  const renderCourseDetails = (request: Request) => {
    const data = request.request_data;
    
    if (request.request_type === 'change') {
      return (
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-2">Courses to Change:</p>
            <div className="flex flex-wrap gap-2">
              {data.oldCourses?.map((c: any, i: number) => (
                <Badge key={i} variant="outline">{c.courseCode}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">New Courses:</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.newCourses?.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{c.courseCode}</TableCell>
                      <TableCell>{c.descriptiveTitle}</TableCell>
                      <TableCell>{c.sectionCode}</TableCell>
                      <TableCell>{c.time}</TableCell>
                      <TableCell>{c.day}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Day</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.courses?.map((c: any, i: number) => (
              <TableRow key={i}>
                <TableCell>{c.courseCode}</TableCell>
                <TableCell>{c.descriptiveTitle}</TableCell>
                <TableCell>{c.sectionCode}</TableCell>
                <TableCell>{c.time}</TableCell>
                <TableCell>{c.day}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No pending requests</p>
          <p className="text-sm text-muted-foreground/70">Requests will appear here as students submit them</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <span>Request Queue</span>
            <Badge variant="secondary">{requests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="divide-y">
            {requests.map((request, index) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDetails(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm md:text-base truncate">
                        {request.last_name}, {request.first_name}
                      </span>
                      <Badge variant="outline" className={`${getStatusClass(request.status)} text-xs`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status}</span>
                        </span>
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{getRequestTypeLabel(request.request_type)}</span>
                      <span>•</span>
                      <span>{request.id_number}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">
                        {format(new Date(request.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {request.request_data?.reason && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        Reason: {request.request_data.reason}
                      </p>
                    )}
                    {request.request_type === 'add_with_exception' && (
                      <p className="text-xs text-red-600 mt-1">Student needs to meet the Registrar.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Request Details
            </DialogTitle>
            <DialogDescription className="text-base font-semibold text-blue-600">
              {selectedRequest && getRequestTypeLabel(selectedRequest.request_type)}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID Number:</span>
                  <p className="font-medium">{selectedRequest.id_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">
                    {selectedRequest.first_name} {selectedRequest.middle_name} {selectedRequest.last_name}
                    {selectedRequest.suffix && ` ${selectedRequest.suffix}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">College:</span>
                  <p className="font-medium">{selectedRequest.college}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Program:</span>
                  <p className="font-medium">{selectedRequest.program}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{selectedRequest.phone_number}</p>
                </div>
                {selectedRequest.facebook && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Facebook:</span>
                    <p className="font-medium">{selectedRequest.facebook}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={getStatusClass(selectedRequest.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedRequest.status)}
                      <span className="capitalize">{selectedRequest.status}</span>
                    </span>
                  </Badge>
                </div>
                
                <div className="text-sm">
                  <p>
                    <span className="text-muted-foreground">Submitted:</span>{' '}
                    {format(new Date(selectedRequest.created_at), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Request Details:</p>
                {selectedRequest.request_data?.reason && (
                  <p className="text-sm mb-2">
                    <span className="text-muted-foreground">Reason:</span> {selectedRequest.request_data.reason}
                  </p>
                )}
                {selectedRequest.request_type === 'add_with_exception' && (
                  <p className="text-sm text-red-600 mb-2">Student needs to meet the Registrar.</p>
                )}
                {renderCourseDetails(selectedRequest)}
              </div>

              <DialogFooter className="border-t pt-4 gap-2 flex-col sm:flex-row">
                {selectedRequest.status === 'pending' && (
                  <Button onClick={handleStartProcess} disabled={processing} className="w-full sm:w-auto">
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Processing
                      </>
                    )}
                  </Button>
                )}
                
                {selectedRequest.status === 'processing' && (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowRejectDialog(true)}
                      disabled={processing}
                      className="w-full sm:w-auto"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => setShowApproveConfirm(true)}
                      disabled={processing}
                      className="w-full sm:w-auto"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this request? The student will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={processing} className="bg-success text-success-foreground hover:bg-success/90">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showRejectDialog}
        onOpenChange={(open) => {
          setShowRejectDialog(open);
          if (!open) {
            setRejectRemarks('');
            setSelectedRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Select a reason or provide remarks for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Predefined Reason</Label>
              <Select
                value={selectedRejectReason}
                onValueChange={setSelectedRejectReason}
                disabled={!selectedRequest}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {selectedRequest &&
                    getRejectReasons(selectedRequest.request_type).map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="remarks">Remarks / Reason</Label>
              <Textarea
                id="remarks"
                placeholder="Enter additional details or a custom reason..."
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing || (!rejectRemarks.trim() && !selectedRejectReason)}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestQueue;
