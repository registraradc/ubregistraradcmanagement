import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const RoleSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col font-sans">
      <div className="flex-grow flex flex-col items-center justify-center px-4 pb-4 pt-12 md:pt-16 lg:pt-20">
        <div className="w-full max-w-5xl animate-fade-in">
          <div className="text-center mb-12 animate-slide-up">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-none tracking-tight text-slate-900 mb-2">
              ADC Request
            </h1>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-none tracking-tight text-blue-600 mb-6">
              Management
            </h1>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Streamline your course adding, dropping, and changing requests with our efficient digital system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto mb-8">
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-100 shadow-sm bg-white animate-slide-up animate-scale-in"
              onClick={() => navigate('/student/login')}
              style={{ animationDelay: '120ms', animationFillMode: 'both' }}
            >
              <CardContent className="p-8 flex flex-col h-full">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
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
                  className="group w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 text-base rounded-lg transition-colors inline-flex items-center justify-center"
                >
                  <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                    Continue as Student
                  </span>
                  <ArrowRight className="w-4 h-4 ml-2 transition-all duration-200 group-hover:translate-x-1 group-hover:ml-4" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-100 shadow-sm bg-white animate-slide-up animate-scale-in"
              onClick={() => navigate('/staff/login')}
              style={{ animationDelay: '220ms', animationFillMode: 'both' }}
            >
              <CardContent className="p-8 flex flex-col h-full">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
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
                  className="group w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 text-base rounded-lg transition-colors inline-flex items-center justify-center"
                >
                  <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                    Continue as Staff
                  </span>
                  <ArrowRight className="w-4 h-4 ml-2 transition-all duration-200 group-hover:translate-x-1 group-hover:ml-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="w-full bg-white/90 border-t border-slate-200 backdrop-blur py-2">
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

export default RoleSelect;
