import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RequestForm from '@/components/student/RequestForm';
import RequestStatusList from '@/components/student/RequestStatusList';
import { LogOut, FileText, ClipboardList, GraduationCap, Loader2 } from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('form');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/student/login');
    }
    if (!loading && profile && profile.role !== 'student') {
      navigate('/staff/dashboard');
    }
  }, [user, profile, loading, navigate]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSubmitSuccess = () => {
    setActiveTab('status');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-sm md:text-base">Student Dashboard</h1>
              <p className="text-xs text-muted-foreground">{user?.email ?? profile?.email ?? ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogoutClick} className="hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-grow">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="form" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>New Request</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span>My Requests</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="animate-fade-in">
            <RequestForm onSubmitSuccess={handleSubmitSuccess} />
          </TabsContent>

          <TabsContent value="status" className="animate-fade-in">
            <RequestStatusList />
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-full bg-white/90 border-t border-slate-200 backdrop-blur py-2 mt-auto">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-slate-600 text-[clamp(10px,3vw,13px)] text-center">
            <span>Developed by</span>
            <img
              src="/ubytes/ubytesLogo.png"
              alt="UBYTeS logo"
              className="h-[clamp(14px,3.8vw,18px)] w-[clamp(14px,3.8vw,18px)] object-contain"
            />
            <span>UBYTeS - University of Bohol Young Thinkers Society</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
