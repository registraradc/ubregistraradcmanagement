import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Clock, Settings, Play, CheckCircle, XCircle, FileText, User, Search, Filter, Flag } from 'lucide-react';
import { colleges } from '@/lib/colleges';

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
  user_id: string;
  request_type: 'add' | 'add_with_exception' | 'change' | 'drop' | 'change_year_level';
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  remarks: string | null;
  created_at: string;
  processed_at: string | null;
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
  is_flagged?: boolean;
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

type ItemDecisionStatus = 'approved' | 'rejected' | '';

interface ItemDecision {
  status: ItemDecisionStatus;
  rejectReason: string;
  remarks: string;
}

const RequestQueue = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedRequestItems, setSelectedRequestItems] = useState<RequestItem[] | null>(null);
  const [selectedRequestItemsLoading, setSelectedRequestItemsLoading] = useState(false);
  const [itemDecisions, setItemDecisions] = useState<Record<string, ItemDecision>>({});
  const [showFinalizeConfirmation, setShowFinalizeConfirmation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [finalizeRemarks, setFinalizeRemarks] = useState('');

  const filteredRequests = requests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      request.id_number.toLowerCase().includes(searchLower) ||
      request.first_name.toLowerCase().includes(searchLower) ||
      request.last_name.toLowerCase().includes(searchLower) ||
      (request.middle_name && request.middle_name.toLowerCase().includes(searchLower));

    const matchesCollege = selectedCollege === 'all' || request.college === selectedCollege;
    const matchesFlagged = showFlaggedOnly ? request.is_flagged : true;

    return matchesSearch && matchesCollege && matchesFlagged;
  });

  const toggleFlag = async (e: React.MouseEvent, request: Request) => {
    e.stopPropagation();
    const newFlagStatus = !request.is_flagged;
    
    // Optimistic update
    setRequests(requests.map(r => 
      r.id === request.id ? { ...r, is_flagged: newFlagStatus } : r
    ));

    const { error } = await supabase
      .from('requests')
      .update({ is_flagged: newFlagStatus })
      .eq('id', request.id);

    if (error) {
      console.error('Error updating flag status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flag status',
        variant: 'destructive',
      });
      // Revert optimistic update
      setRequests(requests.map(r => 
        r.id === request.id ? { ...r, is_flagged: !newFlagStatus } : r
      ));
    }
  };

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

  useEffect(() => {
    if (!showDetails || !selectedRequest) {
      setSelectedRequestItems(null);
      setItemDecisions({});
      setFinalizeRemarks('');
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
        setItemDecisions({});
        setSelectedRequestItemsLoading(false);
        return;
      }

      const items = data as RequestItem[];
      setSelectedRequestItems(items);
      setItemDecisions(
        items.reduce<Record<string, ItemDecision>>((acc, item) => {
          acc[item.id] = { status: '', rejectReason: '', remarks: '' };
          return acc;
        }, {})
      );
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

  const updateItemDecision = (itemId: string, patch: Partial<ItemDecision>) => {
    setItemDecisions((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  };

  const setAllDecisions = (status: Exclude<ItemDecisionStatus, ''>) => {
    if (!selectedRequestItems) return;
    setItemDecisions((prev) => {
      const next: Record<string, ItemDecision> = { ...prev };
      selectedRequestItems.forEach((item) => {
        next[item.id] = {
          status,
          rejectReason: status === 'rejected' ? next[item.id]?.rejectReason ?? '' : '',
          remarks: status === 'rejected' ? next[item.id]?.remarks ?? '' : '',
        };
      });
      return next;
    });
  };

  const setGroupDecision = (groupId: string, status: Exclude<ItemDecisionStatus, ''>) => {
    if (!selectedRequestItems) return;
    const groupItems = selectedRequestItems.filter((i) => i.group_id === groupId);
    setItemDecisions((prev) => {
      const next: Record<string, ItemDecision> = { ...prev };
      groupItems.forEach((item) => {
        next[item.id] = {
          status,
          rejectReason: status === 'rejected' ? next[item.id]?.rejectReason ?? '' : '',
          remarks: status === 'rejected' ? next[item.id]?.remarks ?? '' : '',
        };
      });
      return next;
    });
  };

  const handleFinalizeClick = () => {
    if (!selectedRequest) return;
    if (selectedRequest.status !== 'processing') return;
    if (!selectedRequestItems || selectedRequestItems.length === 0) {
      toast({
        title: 'Missing Items',
        description: 'This request has no course items to decide.',
        variant: 'destructive',
      });
      return;
    }

    const missing = selectedRequestItems.filter((i) => !itemDecisions[i.id]?.status);
    if (missing.length > 0) {
      toast({
        title: 'Incomplete Decisions',
        description: 'Decide approve/reject for every course before finalizing.',
        variant: 'destructive',
      });
      return;
    }

    const incompleteRejections = selectedRequestItems.filter((i) => {
      const decision = itemDecisions[i.id];
      return decision?.status === 'rejected' && !decision.rejectReason && !decision.remarks.trim();
    });

    if (incompleteRejections.length > 0) {
      toast({
        title: 'Missing Rejection Details',
        description: 'Please provide a reason or remarks for all rejected items.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRequest.request_type === 'change') {
      const groupStatus = selectedRequestItems.reduce<Record<string, Set<string>>>((acc, item) => {
        if (!item.group_id) return acc;
        const status = itemDecisions[item.id]?.status ?? '';
        acc[item.group_id] = acc[item.group_id] ? acc[item.group_id] : new Set<string>();
        acc[item.group_id].add(status);
        return acc;
      }, {});

      const mismatched = Object.values(groupStatus).some((s) => s.size > 1);
      if (mismatched) {
        toast({
          title: 'Invalid Change Decision',
          description: 'Each change pair must be approved or rejected together.',
          variant: 'destructive',
        });
        return;
      }
    }

    setShowFinalizeConfirmation(true);
  };

  const executeFinalization = async () => {
    if (!selectedRequest || !selectedRequestItems) return;

    const payload = selectedRequestItems.map((i) => {
      const d = itemDecisions[i.id];
      const remarks = d.status === 'rejected'
        ? d.rejectReason
          ? d.remarks.trim()
            ? `${d.rejectReason} - ${d.remarks.trim()}`
            : d.rejectReason
          : d.remarks.trim()
        : '';

      return { id: i.id, status: d.status, remarks };
    });

    setProcessing(true);
    const { error } = await supabase.rpc('finalize_request_decisions', {
      p_request_id: selectedRequest.id,
      p_item_decisions: payload,
      p_request_remarks: finalizeRemarks.trim() ? finalizeRemarks.trim() : null,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setProcessing(false);
      setShowFinalizeConfirmation(false);
      return;
    }

    toast({
      title: 'Request Finalized',
      description: 'The student has been notified.',
    });
    setShowDetails(false);
    setShowFinalizeConfirmation(false);
    setSelectedRequest(null);
    setSelectedRequestItems(null);
    setItemDecisions({});
    setFinalizeRemarks('');
    setProcessing(false);
    fetchRequests();
  };

  const renderCourseDetails = (request: Request) => {
    const data = request.request_data;
    
    if (request.request_type === 'change') {
      return (
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-2">Courses to Change:</p>
            <div className="flex flex-wrap gap-2">
              {data.oldCourses?.map((c, i) => (
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
          <p className="text-muted-foreground">No pending requests</p>
          <p className="text-sm text-muted-foreground/70">Requests will appear here as students submit them</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-3 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <span>Request Queue</span>
              <Badge variant="secondary">{filteredRequests.length}</Badge>
            </CardTitle>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or Name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[250px] flex gap-2">
              <Button
                variant={showFlaggedOnly ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
                title={showFlaggedOnly ? "Show All" : "Show Flagged Only"}
              >
                <Flag className={`w-4 h-4 ${showFlaggedOnly ? "fill-current" : ""}`} />
              </Button>
              <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter by College" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges.map((college) => (
                    <SelectItem key={college.abbreviation} value={college.name}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="divide-y">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No requests found matching your filters.
              </div>
            ) : (
              filteredRequests.map((request, index) => (
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
                      {requests.findIndex(r => r.id === request.id) + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => toggleFlag(e, request)}
                    >
                      <Flag className={`w-4 h-4 ${request.is_flagged ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                    </Button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm md:text-base truncate">
                          {request.last_name}, {request.first_name}
                        </span>
                        {request.is_flagged && (
                          <Badge variant="destructive" className="text-xs">
                            Lacking Dean's Note/Requirements
                          </Badge>
                        )}
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
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-screen-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Request Details
            </DialogTitle>
            <DialogDescription className="text-base font-semibold text-blue-600 text-left">
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
                      <span className="capitalize">{selectedRequest.status}</span>
                    </span>
                  </Badge>
                  {selectedRequest.is_flagged && (
                    <Badge variant="destructive">
                      Lacking Dean's Note/Requirements
                    </Badge>
                  )}
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
                  <p className="text-sm mb-2 break-words">
                    <span className="text-muted-foreground">Reason:</span> {selectedRequest.request_data.reason}
                  </p>
                )}
                {selectedRequest.request_type === 'add_with_exception' && (
                  <p className="text-sm text-red-600 mb-2">Student needs to meet the Registrar.</p>
                )}
                {renderCourseDetails(selectedRequest)}
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Decisions:</p>
                {selectedRequest.status !== 'processing' && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Start processing to finalize decisions.
                  </p>
                )}

                {selectedRequestItemsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !selectedRequestItems || selectedRequestItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No course items found for this request.</p>
                ) : selectedRequest.request_type === 'change' ? (
                  <div className="space-y-3">
                    {Array.from(
                      selectedRequestItems.reduce<Map<string, RequestItem[]>>((acc, item) => {
                        const key = item.group_id ?? item.id;
                        acc.set(key, acc.get(key) ? [...(acc.get(key) as RequestItem[]), item] : [item]);
                        return acc;
                      }, new Map())
                    ).map(([groupId, items]) => {
                      const dropItem = items.find((i) => i.action === 'drop');
                      const addItem = items.find((i) => i.action === 'add');
                      const currentStatus = itemDecisions[items[0].id]?.status ?? '';

                      return (
                        <div key={groupId} className="p-3 rounded-lg border space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">
                              {dropItem?.course_code || '—'} → {addItem?.course_code || '—'}
                            </p>
                            <Select
                              value={currentStatus}
                              onValueChange={(v) => setGroupDecision(groupId, v as Exclude<ItemDecisionStatus, ''>)}
                              disabled={selectedRequest.status !== 'processing' || processing}
                            >
                              <SelectTrigger className={`w-[180px] ${currentStatus === 'approved' ? 'text-green-600' : currentStatus === 'rejected' ? 'text-red-600' : ''}`}>
                                <SelectValue placeholder="Select decision" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="approved" className="text-green-600">Approve</SelectItem>
                                <SelectItem value="rejected" className="text-red-600">Reject</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {currentStatus === 'rejected' && (
                            <div className="space-y-3">
                              <div>
                                <Label>Predefined Reason</Label>
                                <Select
                                  value={itemDecisions[items[0].id]?.rejectReason ?? ''}
                                  onValueChange={(v) => {
                                    items.forEach((it) => updateItemDecision(it.id, { rejectReason: v }));
                                  }}
                                  disabled={selectedRequest.status !== 'processing' || processing}
                                >
                                  <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select a reason" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getRejectReasons(selectedRequest.request_type).map((reason) => (
                                      <SelectItem key={reason} value={reason}>
                                        {reason}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Remarks</Label>
                                <Textarea
                                  value={itemDecisions[items[0].id]?.remarks ?? ''}
                                  onChange={(e) => {
                                    items.forEach((it) => updateItemDecision(it.id, { remarks: e.target.value }));
                                  }}
                                  rows={2}
                                  className="mt-2"
                                  disabled={selectedRequest.status !== 'processing' || processing}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
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
                            <TableHead>Decision</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRequestItems.map((item) => {
                            const decision = itemDecisions[item.id];
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{item.course_code}</TableCell>
                                <TableCell>{item.descriptive_title ?? ''}</TableCell>
                                <TableCell>{item.section_code ?? ''}</TableCell>
                                <TableCell>{item.time ?? ''}</TableCell>
                                <TableCell>{item.day ?? ''}</TableCell>
                                <TableCell className="min-w-[320px]">
                                  <div className="space-y-2">
                                    <Select
                                      value={decision?.status ?? ''}
                                      onValueChange={(v) =>
                                        updateItemDecision(item.id, {
                                          status: v as ItemDecisionStatus,
                                          rejectReason: v === 'rejected' ? decision?.rejectReason ?? '' : '',
                                          remarks: v === 'rejected' ? decision?.remarks ?? '' : '',
                                        })
                                      }
                                      disabled={selectedRequest.status !== 'processing' || processing}
                                    >
                                      <SelectTrigger className={decision?.status === 'approved' ? 'text-green-600' : decision?.status === 'rejected' ? 'text-red-600' : ''}>
                                        <SelectValue placeholder="Select decision" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="approved" className="text-green-600">Approve</SelectItem>
                                        <SelectItem value="rejected" className="text-red-600">Reject</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {decision?.status === 'rejected' && (
                                      <div className="space-y-2">
                                        <Select
                                          value={decision.rejectReason}
                                          onValueChange={(v) => updateItemDecision(item.id, { rejectReason: v })}
                                          disabled={selectedRequest.status !== 'processing' || processing}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a reason" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getRejectReasons(selectedRequest.request_type).map((reason) => (
                                              <SelectItem key={reason} value={reason}>
                                                {reason}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Textarea
                                          placeholder="Optional remarks..."
                                          value={decision.remarks}
                                          onChange={(e) => updateItemDecision(item.id, { remarks: e.target.value })}
                                          rows={2}
                                          disabled={selectedRequest.status !== 'processing' || processing}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {selectedRequestItems.map((item) => {
                        const decision = itemDecisions[item.id];
                        return (
                          <div key={item.id} className="p-3 rounded-lg border">
                            <p className="text-sm font-medium">{item.course_code}</p>
                            {item.descriptive_title && (
                              <p className="text-xs text-muted-foreground break-words">{item.descriptive_title}</p>
                            )}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                              <span className="text-xs text-muted-foreground">Section</span>
                              <span className="text-xs font-medium break-words">{item.section_code ?? ''}</span>
                              <span className="text-xs text-muted-foreground">Time</span>
                              <span className="text-xs font-medium break-words">{item.time ?? ''}</span>
                              <span className="text-xs text-muted-foreground">Day</span>
                              <span className="text-xs font-medium break-words">{item.day ?? ''}</span>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label>Decision</Label>
                              <Select
                                value={decision?.status ?? ''}
                                onValueChange={(v) =>
                                  updateItemDecision(item.id, {
                                    status: v as ItemDecisionStatus,
                                    rejectReason: v === 'rejected' ? decision?.rejectReason ?? '' : '',
                                    remarks: v === 'rejected' ? decision?.remarks ?? '' : '',
                                  })
                                }
                                disabled={selectedRequest.status !== 'processing' || processing}
                              >
                                <SelectTrigger className={decision?.status === 'approved' ? 'text-green-600' : decision?.status === 'rejected' ? 'text-red-600' : ''}>
                                  <SelectValue placeholder="Select decision" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="approved" className="text-green-600">Approve</SelectItem>
                                  <SelectItem value="rejected" className="text-red-600">Reject</SelectItem>
                                </SelectContent>
                              </Select>

                              {decision?.status === 'rejected' && (
                                <div className="space-y-2">
                                  <Label>Predefined Reason</Label>
                                  <Select
                                    value={decision.rejectReason}
                                    onValueChange={(v) => updateItemDecision(item.id, { rejectReason: v })}
                                    disabled={selectedRequest.status !== 'processing' || processing}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getRejectReasons(selectedRequest.request_type).map((reason) => (
                                        <SelectItem key={reason} value={reason}>
                                          {reason}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Label>Remarks</Label>
                                  <Textarea
                                    placeholder="Optional remarks..."
                                    value={decision.remarks}
                                    onChange={(e) => updateItemDecision(item.id, { remarks: e.target.value })}
                                    rows={2}
                                    disabled={selectedRequest.status !== 'processing' || processing}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'processing' && selectedRequestItems && selectedRequestItems.length > 0 && (
                <div className="border rounded-lg p-3">
                  <Label>Comment</Label>
                  <Textarea
                    placeholder="Additional comments for the student..."
                    value={finalizeRemarks}
                    onChange={(e) => setFinalizeRemarks(e.target.value)}
                    rows={3}
                    className="mt-2"
                    disabled={processing}
                  />
                </div>
              )}

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
                      variant="outline"
                      onClick={() => setAllDecisions('approved')}
                      disabled={processing}
                      className="w-full sm:w-auto"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAllDecisions('rejected')}
                      disabled={processing}
                      className="w-full sm:w-auto hover:bg-red-600 hover:text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject All
                    </Button>
                    <Button
                      onClick={handleFinalizeClick}
                      disabled={processing}
                      className="w-full sm:w-auto"
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finalize'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showFinalizeConfirmation} onOpenChange={setShowFinalizeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the request status and notify the student. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeFinalization}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RequestQueue;
