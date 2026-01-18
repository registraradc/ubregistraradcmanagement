import { useState, useEffect, useCallback } from 'react';
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

interface RequestCourse {
  courseCode?: string;
  descriptiveTitle?: string;
  sectionCode?: string;
  time?: string;
  day?: string;
}

interface RequestData {
  reason?: string;
  courses?: RequestCourse[];
  oldCourses?: Array<{ courseCode?: string }>;
  newCourses?: RequestCourse[];
}

interface Request {
  id: string;
  request_type: 'add' | 'add_with_exception' | 'change' | 'drop' | 'change_year_level';
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

interface RequestItem {
  id: string;
  request_id: string;
  group_id: string | null;
  action: 'add' | 'drop';
  course_code: string;
  descriptive_title: string | null;
  section_code: string | null;
  time: string | null;
  day: string | null;
  status: 'pending' | 'approved' | 'rejected';
  remarks: string | null;
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
  const [selectedRequestItems, setSelectedRequestItems] = useState<RequestItem[] | null>(null);
  const [selectedRequestItemsLoading, setSelectedRequestItemsLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (!user) return;

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
  }, [fetchRequests, user]);

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

  useEffect(() => {
    if (!showDetails || !selectedRequest) {
      setSelectedRequestItems(null);
      return;
    }

    let cancelled = false;
    setSelectedRequestItemsLoading(true);

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('request_items')
        .select('*')
        .eq('request_id', selectedRequest.id)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        setSelectedRequestItems(null);
      } else {
        setSelectedRequestItems(data as RequestItem[]);
      }
      setSelectedRequestItemsLoading(false);
    };

    fetchItems();

    return () => {
      cancelled = true;
    };
  }, [showDetails, selectedRequest]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Settings className="w-4 h-4 animate-spin" />;
      case 'approved':
      case 'partially_approved':
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
      case 'partially_approved':
        return 'status-partially-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const getCourseCount = (r: Request, items?: RequestItem[] | null) => {
    if (items && items.length > 0) return items.length;
    if (r.request_type === 'change') {
      const a = r.request_data?.newCourses?.length ?? 0;
      const b = r.request_data?.oldCourses?.length ?? 0;
      return Math.max(a, b);
    }
    return r.request_data?.courses?.length ?? 0;
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

  const renderCourseDetails = (request: Request, items: RequestItem[] | null) => {
    if (items && items.length > 0) {
      if (request.request_type === 'change') {
        const groups = items.reduce<Record<string, RequestItem[]>>((acc, item) => {
          const key = item.group_id ?? item.id;
          acc[key] = acc[key] ? [...acc[key], item] : [item];
          return acc;
        }, {});

        const groupList = Object.entries(groups).map(([groupId, groupItems]) => {
          const dropItem = groupItems.find((i) => i.action === 'drop');
          const addItem = groupItems.find((i) => i.action === 'add');
          const status = addItem?.status ?? dropItem?.status ?? 'pending';
          const remarks = addItem?.remarks ?? dropItem?.remarks ?? null;

          return {
            groupId,
            dropItem,
            addItem,
            status,
            remarks,
          };
        });

        return (
          <div className="space-y-3">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupList.map((g) => (
                    <TableRow key={g.groupId}>
                      <TableCell>{g.dropItem?.course_code ?? ''}</TableCell>
                      <TableCell>{g.addItem?.course_code ?? ''}</TableCell>
                      <TableCell>{g.addItem?.descriptive_title ?? ''}</TableCell>
                      <TableCell>{g.addItem?.section_code ?? ''}</TableCell>
                      <TableCell>{g.addItem?.time ?? ''}</TableCell>
                      <TableCell>{g.addItem?.day ?? ''}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusClass(g.status)}>
                          <span className="capitalize">{g.status.replace('_', ' ')}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal break-words">
                        {g.remarks ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-3">
              {groupList.map((g) => (
                <div key={g.groupId} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm font-medium">{g.dropItem?.course_code ?? ''} → {g.addItem?.course_code ?? ''}</p>
                    <Badge variant="outline" className={getStatusClass(g.status)}>
                      <span className="capitalize">{g.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  {g.addItem?.descriptive_title && (
                    <p className="text-xs text-muted-foreground break-words">
                      {g.addItem.descriptive_title}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                    <span className="text-xs text-muted-foreground">Section</span>
                    <span className="text-xs font-medium break-words">{g.addItem?.section_code ?? ''}</span>
                    <span className="text-xs text-muted-foreground">Time</span>
                    <span className="text-xs font-medium break-words">{g.addItem?.time ?? ''}</span>
                    <span className="text-xs text-muted-foreground">Day</span>
                    <span className="text-xs font-medium break-words">{g.addItem?.day ?? ''}</span>
                    <span className="text-xs text-muted-foreground">Remarks</span>
                    <span className="text-xs font-medium break-words">{g.remarks ?? ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.course_code}</TableCell>
                    <TableCell>{i.descriptive_title ?? ''}</TableCell>
                    <TableCell>{i.section_code ?? ''}</TableCell>
                    <TableCell>{i.time ?? ''}</TableCell>
                    <TableCell>{i.day ?? ''}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusClass(i.status)}>
                        <span className="capitalize">{i.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal break-words">
                      {i.remarks ?? ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {items.map((i) => (
              <div key={i.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-medium">{i.course_code}</p>
                  <Badge variant="outline" className={getStatusClass(i.status)}>
                    <span className="capitalize">{i.status.replace('_', ' ')}</span>
                  </Badge>
                </div>
                {i.descriptive_title && (
                  <p className="text-xs text-muted-foreground break-words">
                    {i.descriptive_title}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                  <span className="text-xs text-muted-foreground">Section</span>
                  <span className="text-xs font-medium break-words">{i.section_code ?? ''}</span>
                  <span className="text-xs text-muted-foreground">Time</span>
                  <span className="text-xs font-medium break-words">{i.time ?? ''}</span>
                  <span className="text-xs text-muted-foreground">Day</span>
                  <span className="text-xs font-medium break-words">{i.day ?? ''}</span>
                  <span className="text-xs text-muted-foreground">Remarks</span>
                  <span className="text-xs font-medium break-words">{i.remarks ?? ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const data = request.request_data;
    
    if (request.request_type === 'change') {
      return (
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-2">Courses to Change:</p>
            <div className="flex flex-wrap gap-2">
              {data.oldCourses?.map((c, i: number) => (
                <Badge key={i} variant="outline">{c.courseCode}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">New Courses:</p>
            <div className="space-y-3">
              <div className="hidden md:block overflow-x-auto">
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
                    {data.newCourses?.map((c, i: number) => (
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
              <div className="md:hidden space-y-3">
                {data.newCourses?.map((c, i: number) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-sm font-medium">{c.courseCode}</p>
                    </div>
                    {c.descriptiveTitle && (
                      <p className="text-xs text-muted-foreground break-words">
                        {c.descriptiveTitle}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                      <span className="text-xs text-muted-foreground">Section</span>
                      <span className="text-xs font-medium break-words">{c.sectionCode ?? ''}</span>
                      <span className="text-xs text-muted-foreground">Time</span>
                      <span className="text-xs font-medium break-words">{c.time ?? ''}</span>
                      <span className="text-xs text-muted-foreground">Day</span>
                      <span className="text-xs font-medium break-words">{c.day ?? ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

  return (
      <div className="space-y-3">
        <div className="hidden md:block overflow-x-auto">
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
              {data.courses?.map((c, i: number) => (
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
        <div className="md:hidden space-y-3">
          {data.courses?.map((c, i: number) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-medium">{c.courseCode}</p>
              </div>
              {c.descriptiveTitle && (
                <p className="text-xs text-muted-foreground break-words">
                  {c.descriptiveTitle}
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                <span className="text-xs text-muted-foreground">Section</span>
                <span className="text-xs font-medium break-words">{c.sectionCode ?? ''}</span>
                <span className="text-xs text-muted-foreground">Time</span>
                <span className="text-xs font-medium break-words">{c.time ?? ''}</span>
                <span className="text-xs text-muted-foreground">Day</span>
                <span className="text-xs font-medium break-words">{c.day ?? ''}</span>
              </div>
            </div>
          ))}
        </div>
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
                        <span className="capitalize">{request.status.replace('_', ' ')}</span>
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
                  {request.request_data?.reason && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Reason: {request.request_data.reason}
                    </p>
                  )}
                  {request.status === 'rejected' && (
                    <p className="text-xs md:text-sm text-red-600">
                      {request.request_type === 'change'
                        ? 'Change request was rejected.'
                        : ((request.request_data?.courses?.length ?? 0) <= 1
                            ? 'Course was rejected.'
                            : 'All courses were rejected.')}
                    </p>
                  )}
                  {request.status === 'approved' && (
                    <p className="text-xs md:text-sm text-blue-600">
                      {getCourseCount(request) <= 1
                        ? 'Course was approved. Kindly check your study load through the student portal.'
                        : 'All courses were approved. Kindly check your study load through the student portal.'}
                    </p>
                  )}
                  {request.status === 'partially_approved' && (
                    <p className="text-xs md:text-sm text-blue-600">
                      Request partially approved. See per‑course results in details.
                    </p>
                  )}
                  {request.request_type === 'add_with_exception' &&
                    request.status !== 'approved' &&
                    request.status !== 'rejected' &&
                    request.status !== 'partially_approved' && (
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
        <DialogContent className="w-[95vw] sm:w-auto max-w-screen-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription className="text-base font-semibold text-blue-600">
              {selectedRequest && getRequestTypeLabel(selectedRequest.request_type)}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID Number:</span>
                  <p className="font-medium break-words">{selectedRequest.id_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium break-words">
                    {selectedRequest.first_name} {selectedRequest.middle_name} {selectedRequest.last_name}
                    {selectedRequest.suffix && ` ${selectedRequest.suffix}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">College:</span>
                  <p className="font-medium break-words">{selectedRequest.college}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Program:</span>
                  <p className="font-medium break-words">{selectedRequest.program}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium break-words">{selectedRequest.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium break-words">{selectedRequest.phone_number}</p>
                </div>
                {selectedRequest.facebook && (
                  <div>
                    <span className="text-muted-foreground">Facebook:</span>
                    <p className="font-medium break-words">{selectedRequest.facebook}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={getStatusClass(selectedRequest.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedRequest.status)}
                      <span className="capitalize">{selectedRequest.status.replace('_', ' ')}</span>
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

                {(selectedRequest.remarks || selectedRequest.status === 'approved' || selectedRequest.status === 'partially_approved' || selectedRequest.status === 'rejected') && (
                  <div
                    className={`mt-4 p-3 rounded-lg ${selectedRequest.status === 'rejected' ? 'bg-red-50' : 'bg-muted'}`}
                  >
                    <p className="text-sm font-medium mb-1">Remarks:</p>
                    {selectedRequest.remarks ? (
                      <p className={`text-sm ${selectedRequest.status === 'rejected' ? 'text-red-600' : 'text-muted-foreground'} break-words`}>
                        {selectedRequest.remarks}
                      </p>
                    ) : (
                      <>
                        {selectedRequest.status === 'approved' && (
                          <p className="text-sm text-blue-600">
                            {getCourseCount(selectedRequest, selectedRequestItems) <= 1
                              ? 'Course was approved. Kindly check your study load through the student portal.'
                              : 'All courses were approved. Kindly check your study load through the student portal.'}
                          </p>
                        )}
                        {selectedRequest.status === 'partially_approved' && (
                          <p className="text-sm text-blue-600">
                            Request partially approved. See per‑course results in details.
                          </p>
                        )}
                        {selectedRequest.status === 'rejected' && (
                          <p className="text-sm text-red-600">
                            {selectedRequest.request_type === 'change'
                              ? 'Change request was rejected.'
                              : (((selectedRequestItems?.length ?? (selectedRequest.request_data?.courses?.length ?? 0)) <= 1)
                                  ? 'Course was rejected.'
                                  : 'All courses were rejected.')}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Request Details:</p>
                {selectedRequest.request_data?.reason && (
                  <p className="text-sm mb-2 break-words">
                    <span className="text-muted-foreground">Reason:</span> {selectedRequest.request_data.reason}
                  </p>
                )}
                {selectedRequest.request_type === 'add_with_exception' &&
                  selectedRequest.status !== 'approved' &&
                  selectedRequest.status !== 'rejected' &&
                  selectedRequest.status !== 'partially_approved' && (
                  <p className="text-sm text-red-600 mb-2">Please see the Registrar.</p>
                )}
                {selectedRequestItemsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  renderCourseDetails(selectedRequest, selectedRequestItems)
                )}
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
