import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RequestForm from '@/components/student/RequestForm';
import RequestStatusList from '@/components/student/RequestStatusList';
import { LogOut, FileText, ClipboardList, GraduationCap, Loader2 } from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('form');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/student/login');
    }
    if (!loading && profile && profile.role !== 'student') {
      navigate('/staff/dashboard');
    }
  }, [user, profile, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSubmitSuccess = () => {
    setActiveTab('status');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm md:text-base">ADC System</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Student Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
    </div>
  );
};

export default StudentDashboard;
