import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, ChevronRight, Trash2, Clock, Settings, CheckCircle, XCircle, FileText } from 'lucide-react';

interface Request {
  id: string;
  request_type: 'add' | 'add_with_exception' | 'change' | 'drop' | 'change_year_level';
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  remarks: string | null;
  created_at: string;
  completed_at: string | null;
  request_data: any;
  id_number: string;
  college: string;
  program: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  email: string;
  phone_number: string;
}

const RequestStatusList = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [queuePositions, setQueuePositions] = useState<Record<string, number>>({});

  const fetchRequests = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('user_id', user.id)
      .neq('request_type', 'change_year_level')
      .order('created_at', { ascending: false });

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
      .channel('student-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const pending = requests.filter((r) => r.status === 'pending');
    if (pending.length === 0) {
      setQueuePositions({});
      return;
    }

    let cancelled = false;

    const computeQueuePositions = async () => {
      const results = await Promise.all(
        pending.map(async (r) => {
          const { data, error } = await supabase.rpc('get_request_queue_position', { p_request_id: r.id });
          if (error || data == null) {
            return { id: r.id, pos: undefined as number | undefined };
          }
          return { id: r.id, pos: data as number };
        })
      );

      if (cancelled) return;

      const map: Record<string, number> = {};
      results.forEach((res) => {
        if (res.pos !== undefined) map[res.id] = res.pos;
      });
      setQueuePositions(map);
    };

    computeQueuePositions();

    const intervalId = window.setInterval(computeQueuePositions, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [requests]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Settings className="w-4 h-4 animate-spin" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
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
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const handleCancel = async () => {
    if (!selectedRequest) return;
    
    setCancelling(true);
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', selectedRequest.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel request.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Request Cancelled',
        description: 'Your request has been removed.',
      });
      setShowDetails(false);
      setShowCancelConfirm(false);
      fetchRequests();
    }
    setCancelling(false);
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
          <p className="text-muted-foreground">No requests yet</p>
          <p className="text-sm text-muted-foreground/70">Submit a request to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">My Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="divide-y">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDetails(true);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm md:text-base truncate">
                      {getRequestTypeLabel(request.request_type)}
                    </span>
                    <Badge variant="outline" className={`${getStatusClass(request.status)} text-xs`}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(request.status)}
                        <span className="capitalize">{request.status}</span>
                      </span>
                    </Badge>
                    {request.status === 'pending' && (
                      <Badge variant="secondary" className="text-xs">
                        <span>Queue #{queuePositions[request.id] ?? '...'}</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Submitted: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  {request.request_type === 'add_with_exception' && (
                    <p className="text-xs md:text-sm text-red-600">
                      Please see the Registrar.
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
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
                  {selectedRequest.status === 'pending' && (
                    <Badge variant="secondary">
                      <span>Queue #{queuePositions[selectedRequest.id] ?? '...'}</span>
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Submitted:</span>{' '}
                    {format(new Date(selectedRequest.created_at), 'MMMM d, yyyy h:mm a')}
                  </p>
                  {selectedRequest.completed_at && (
                    <p>
                      <span className="text-muted-foreground">Completed:</span>{' '}
                      {format(new Date(selectedRequest.completed_at), 'MMMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>

                {selectedRequest.remarks && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Remarks:</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.remarks}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Request Details:</p>
                {selectedRequest.request_type === 'add_with_exception' && (
                  <p className="text-sm text-red-600 mb-2">Please see the Registrar.</p>
                )}
                {renderCourseDetails(selectedRequest)}
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Request</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Cancel Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RequestStatusList;
