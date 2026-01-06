import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const StudentLogin = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/student/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    if (signupPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, 'student');
    setLoading(false);

    if (error) {
      toast({
        title: 'Registration Failed',
        description: error.message.includes('already registered') 
          ? 'This email is already registered. Please log in instead.' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created!',
        description: 'Welcome to the ADC System.',
      });
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      <div className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
      </div>

      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-slide-up">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <GraduationCap className="w-7 h-7 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Student Portal</CardTitle>
            <CardDescription>Access your ADC request dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="input-focus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="input-focus"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="input-focus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="input-focus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="input-focus"
                    />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="w-full bg-white/90 border-t border-slate-200 backdrop-blur py-2 mt-auto">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 whitespace-nowrap text-slate-600 text-[clamp(10px,3vw,13px)]">
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

export default StudentLogin;
