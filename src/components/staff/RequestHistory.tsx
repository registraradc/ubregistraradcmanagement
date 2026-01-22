import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, CheckCircle, XCircle, FileText, ChevronRight, ChevronLeft, Search, Filter, Edit } from 'lucide-react';
import { colleges } from '@/lib/colleges';
import { useToast } from '@/hooks/use-toast';

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
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'partially_approved';
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

const RequestHistory = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRequestItems, setSelectedRequestItems] = useState<RequestItem[] | null>(null);
  const [selectedRequestItemsLoading, setSelectedRequestItemsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [itemDecisions, setItemDecisions] = useState<Record<string, ItemDecision>>({});
  const [processing, setProcessing] = useState(false);
  const [showFinalizeConfirmation, setShowFinalizeConfirmation] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 100;

  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCollege, selectedStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    
    let query = supabase
      .from('requests')
      .select('*', { count: 'exact' })
      .in('status', ['approved', 'rejected', 'partially_approved'])
      .neq('request_type', 'change_year_level');

    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus as Request['status']);
    }

    if (selectedCollege !== 'all') {
      query = query.eq('college', selectedCollege);
    }

    if (debouncedSearchQuery) {
      query = query.or(`id_number.ilike.%${debouncedSearchQuery}%,first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,middle_name.ilike.%${debouncedSearchQuery}%`);
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await query
      .order('completed_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch request history.',
        variant: 'destructive',
      });
    } else {
      setRequests(data as Request[]);
      if (count !== null) {
        setTotalCount(count);
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
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
  }, [currentPage, debouncedSearchQuery, selectedCollege, selectedStatus]);

  useEffect(() => {
    if (!showDetails || !selectedRequest) {
      setSelectedRequestItems(null);
      setIsEditing(false);
      setItemDecisions({});
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
      } else {
        const items = data as RequestItem[];
        setSelectedRequestItems(items);
        setItemDecisions(
          items.reduce<Record<string, ItemDecision>>((acc, item) => {
            // Simple initialization. Complex parsing of "Reason - Remarks" omitted for safety.
            acc[item.id] = { 
              status: item.status === 'pending' ? '' : item.status as ItemDecisionStatus, 
              rejectReason: '', 
              remarks: item.remarks || '' 
            };
            return acc;
          }, {})
        );
      }
      setSelectedRequestItemsLoading(false);
    };

    fetchItems();

    return () => {
      cancelled = true;
    };
  }, [showDetails, selectedRequest]);

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

  const handleSaveChanges = () => {
    if (!selectedRequest) return;
    // Removed 'processing' check because we are editing history
    
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
        description: 'Decide approve/reject for every course before saving.',
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

  const executeSaveChanges = async () => {
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
    // Use the RPC to update statuses. It should handle completed requests too, hopefully.
    // If not, we might need to manually update.
    const { error } = await supabase.rpc('finalize_request_decisions', {
      p_request_id: selectedRequest.id,
      p_item_decisions: payload,
      p_request_remarks: null,
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
      title: 'Changes Saved',
      description: 'The request has been updated.',
    });
    setShowDetails(false);
    setShowFinalizeConfirmation(false);
    setSelectedRequest(null);
    setSelectedRequestItems(null);
    setItemDecisions({});
    setIsEditing(false);
    setProcessing(false);
    fetchRequests();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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
            items: groupItems,
          };
        });

        if (isEditing) {
          return (
            <div className="space-y-3">
              {groupList.map((g) => {
                const currentStatus = itemDecisions[g.items[0].id]?.status ?? '';
                
                return (
                  <div key={g.groupId} className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {g.dropItem?.course_code || '—'} → {g.addItem?.course_code || '—'}
                      </p>
                      <Select
                        value={currentStatus}
                        onValueChange={(v) => setGroupDecision(g.groupId, v as Exclude<ItemDecisionStatus, ''>)}
                        disabled={processing}
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
                            value={itemDecisions[g.items[0].id]?.rejectReason ?? ''}
                            onValueChange={(v) => {
                              g.items.forEach((it) => updateItemDecision(it.id, { rejectReason: v }));
                            }}
                            disabled={processing}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {getRejectReasons(request.request_type).map((reason) => (
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
                            value={itemDecisions[g.items[0].id]?.remarks ?? ''}
                            onChange={(e) => {
                              g.items.forEach((it) => updateItemDecision(it.id, { remarks: e.target.value }));
                            }}
                            rows={2}
                            className="mt-2"
                            disabled={processing}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

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

      if (isEditing) {
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
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const decision = itemDecisions[item.id];
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.course_code}</TableCell>
                        <TableCell>{item.descriptive_title ?? ''}</TableCell>
                        <TableCell>{item.section_code ?? ''}</TableCell>
                        <TableCell>{item.time ?? ''}</TableCell>
                        <TableCell>{item.day ?? ''}</TableCell>
                        <TableCell className="min-w-[200px]">
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
                              disabled={processing}
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
                                  disabled={processing}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a reason" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getRejectReasons(request.request_type).map((reason) => (
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
                                  disabled={processing}
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
              {items.map((item) => {
                const decision = itemDecisions[item.id];
                return (
                  <div key={item.id} className="p-3 rounded-lg border">
                    <p className="text-sm font-medium">{item.course_code}</p>
                    {item.descriptive_title && (
                      <p className="text-xs text-muted-foreground break-words">
                        {item.descriptive_title}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                      <span className="text-xs text-muted-foreground">Section</span>
                      <span className="text-xs font-medium break-words">{item.section_code ?? ''}</span>
                      <span className="text-xs text-muted-foreground">Time</span>
                      <span className="text-xs font-medium break-words">{item.time ?? ''}</span>
                      <span className="text-xs text-muted-foreground">Day</span>
                      <span className="text-xs font-medium break-words">{item.day ?? ''}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Select
                        value={decision?.status ?? ''}
                        onValueChange={(v) =>
                          updateItemDecision(item.id, {
                            status: v as ItemDecisionStatus,
                            rejectReason: v === 'rejected' ? decision?.rejectReason ?? '' : '',
                            remarks: v === 'rejected' ? decision?.remarks ?? '' : '',
                          })
                        }
                        disabled={processing}
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
                            disabled={processing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {getRejectReasons(request.request_type).map((reason) => (
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
                            disabled={processing}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
            <p className="font-medium mb-2">Courses Changed:</p>
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

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-3 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <span>Request History</span>
              <Badge variant="secondary">{totalCount}</Badge>
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
            <div className="w-full md:w-[200px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="partially_approved">Partially Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[250px]">
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
            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No requests found matching your filters.
              </div>
            ) : (
              requests.map((request) => (
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
                      <Badge variant="outline" className={`${getStatusClass(request.status)} text-xs`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status.replace('_', ' ')}</span>
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
                    {request.request_data?.reason && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        Reason: {request.request_data.reason}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              ))
            )}
          </div>
          
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-t">
              <div className="text-sm text-muted-foreground order-2 sm:order-1">
                Showing {Math.min(totalCount, (currentPage - 1) * ITEMS_PER_PAGE + 1)} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} entries
              </div>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                <div className="text-sm font-medium min-w-[3rem] text-center">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-screen-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Request Details</DialogTitle>
            </div>
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

                {selectedRequest.remarks && !isEditing && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Remarks:</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.remarks}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Request Details:</p>
                {selectedRequest.request_data?.reason && (
                  <p className="text-sm mb-2">
                    <span className="text-muted-foreground">Reason:</span> {selectedRequest.request_data.reason}
                  </p>
                )}
                {selectedRequestItemsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  renderCourseDetails(selectedRequest, selectedRequestItems)
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)} 
                      disabled={processing}
                      className="text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                    >
                      Cancel
                    </Button>
                    <div className="flex-1 hidden sm:block" />
                    <Button variant="outline" onClick={() => setAllDecisions('approved')} disabled={processing}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve All
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setAllDecisions('rejected')} 
                      disabled={processing}
                      className="hover:bg-red-600 hover:text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject All
                    </Button>
                    <Button onClick={handleSaveChanges} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
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
            <AlertDialogTitle>Save Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the request status and notify the student. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeSaveChanges} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RequestHistory;
