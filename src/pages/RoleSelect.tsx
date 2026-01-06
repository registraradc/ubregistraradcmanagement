import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const RoleSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none tracking-tight text-slate-900 mb-2">
            Academic Request
          </h1>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none tracking-tight text-blue-600 mb-6">
            Management
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Streamline your course adding, dropping, and changing requests with our efficient digital system.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Student Card */}
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-100 shadow-sm bg-white"
            onClick={() => navigate('/student/login')}
          >
            <CardContent className="p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <GraduationCap className="w-7 h-7 text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                I'm a Student
              </h2>
              <p className="text-slate-500 mb-6">
                Submit and track your course modification requests
              </p>

              <ul className="space-y-3 mb-8 flex-grow">
                {['Add, drop, or change courses', 'Request year level changes', 'Track request status in real-time'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 text-base rounded-lg group-hover:bg-blue-700 transition-colors"
              >
                Continue as Student <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Staff Card */}
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-100 shadow-sm bg-white"
            onClick={() => navigate('/staff/login')}
          >
            <CardContent className="p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-slate-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                I'm Registrar Staff
              </h2>
              <p className="text-slate-500 mb-6">
                Process and manage student requests
              </p>

              <ul className="space-y-3 mb-8 flex-grow">
                {['View queued requests', 'Approve or reject requests', 'Access request history'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 text-base rounded-lg group-hover:bg-blue-700 transition-colors"
              >
                Continue as Staff <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-400 text-sm">
            © 2026 University Registrar. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelect;
