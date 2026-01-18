import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RequestQueue from '@/components/staff/RequestQueue';
import RequestHistory from '@/components/staff/RequestHistory';
import { LogOut, ClipboardList, History, Users, Loader2 } from 'lucide-react';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/staff/login');
    }
    if (!loading && profile && profile.role !== 'staff') {
      navigate('/student/dashboard');
    }
  }, [user, profile, loading, navigate]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h1 className="font-semibold text-sm md:text-base">Staff Dashboard</h1>
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
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span>Queue</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="animate-fade-in">
            <RequestQueue />
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in">
            <RequestHistory />
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

export default StaffDashboard;
