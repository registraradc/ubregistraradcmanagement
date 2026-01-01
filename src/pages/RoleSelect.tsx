import { useNavigate } from 'react-router-dom';
import { GraduationCap, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const RoleSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-4xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
            ADC Request System
          </h1>
          <p className="text-primary-foreground/80 text-sm md:text-base">
            Adding, Dropping, and Changing Courses Portal
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card 
            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-card/95 backdrop-blur-sm border-2 border-transparent hover:border-accent"
            onClick={() => navigate('/student/login')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Student</CardTitle>
              <CardDescription className="text-sm">
                Submit and track your course requests
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="gradient" className="w-full" size="lg">
                Continue as Student
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-card/95 backdrop-blur-sm border-2 border-transparent hover:border-accent"
            onClick={() => navigate('/staff/login')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <Briefcase className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-xl">Registrar Staff</CardTitle>
              <CardDescription className="text-sm">
                Process and manage student requests
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="gradient" className="w-full" size="lg">
                Continue as Staff
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-primary-foreground/60 text-xs mt-6">
          © 2024 University Registrar Office
        </p>
      </div>
    </div>
  );
};

export default RoleSelect;
