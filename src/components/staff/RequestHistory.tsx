import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, CheckCircle, XCircle, FileText, ChevronRight } from 'lucide-react';

interface Request {
  id: string;
  user_id: string;
  request_type: 'add' | 'change' | 'drop' | 'change_year_level';
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

const RequestHistory = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['approved', 'rejected'])
      .order('completed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setRequests(data as Request[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('staff-history')
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
      case 'change':
        return 'Change Course';
      case 'drop':
        return 'Drop Course';
      case 'change_year_level':
        return 'Change Year Level';
      default:
        return type;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const renderCourseDetails = (request: Request) => {
    const data = request.request_data;
    
    if (request.request_type === 'change_year_level') {
      return (
        <div className="space-y-2">
          <p><strong>Current Year Level:</strong> {data.currentYearLevel}</p>
          <p><strong>Reason:</strong> {data.reason}</p>
        </div>
      );
    }

    if (request.request_type === 'change') {
      return (
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-2">Courses Changed:</p>
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
          <p className="text-muted-foreground">No completed requests yet</p>
          <p className="text-sm text-muted-foreground/70">Processed requests will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">Request History</CardTitle>
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
                      {request.last_name}, {request.first_name}
                    </span>
                    <Badge className={`${getStatusClass(request.status)} text-xs`}>
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
                    {request.completed_at && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          Completed: {format(new Date(request.completed_at), 'MMM d, yyyy')}
                        </span>
                      </>
                    )}
                  </div>
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
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusClass(selectedRequest.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedRequest.status)}
                      <span className="capitalize">{selectedRequest.status}</span>
                    </span>
                  </Badge>
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
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium mb-1">Rejection Remarks:</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.remarks}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Request Details:</p>
                {renderCourseDetails(selectedRequest)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestHistory;
