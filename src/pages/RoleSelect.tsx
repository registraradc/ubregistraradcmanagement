import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  ArrowRight, 
  ChevronDown, 
  ArrowUp,
  Calendar, 
  Banknote, 
  AlertCircle, 
  CheckCircle2,
  Building2,
  FileCheck,
  FileText,
  Smartphone,
  MonitorCheck,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const RoleSelect = () => {
  const navigate = useNavigate();
  const reminderRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);

    const handleScroll = () => setScrollY(window.scrollY);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === reminderRef.current && entry.isIntersecting) {
            setIsVisible(true);
          }
          if (entry.target === guideRef.current && entry.isIntersecting) {
            setIsGuideVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (reminderRef.current) {
      observer.observe(reminderRef.current);
    }
    if (guideRef.current) {
      observer.observe(guideRef.current);
    }

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener('resize', checkMobile);
      if (reminderRef.current) {
        observer.unobserve(reminderRef.current);
      }
      if (guideRef.current) {
        observer.unobserve(guideRef.current);
      }
    };
  }, []);

  const scrollToReminder = () => {
    reminderRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col font-sans overflow-x-hidden">
      {/* Hero Section */}
      <div 
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 md:pt-16 lg:pt-20 overflow-hidden"
        style={{
          transform: `translateY(${scrollY * (isMobile ? 0.1 : 0.2)}px)`,
          opacity: Math.max(0, 1 - scrollY / (isMobile ? 1000 : 700))
        }}
      >
        {/* Background Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.04] select-none"
          aria-hidden="true"
        >
          <img 
            src="/UB Logo.png" 
            alt="" 
            className="w-[80%] md:w-[60%] lg:w-[50%] object-contain animate-pulse"
          />
        </div>

        <div className="w-full max-w-5xl animate-fade-in flex-grow flex flex-col justify-center relative z-10">
          <div className="text-center mb-8 md:mb-12 animate-slide-up">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-none tracking-tight text-slate-900 mb-2">
              UB Registrar
            </h1>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-blue-600 mb-4 md:mb-6">
              ADC Request Management
            </h1>
            <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed px-4">
              Streamline your course adding, dropping, and changing requests with our efficient digital system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto mb-16 md:mb-16">
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-100 shadow-sm bg-white animate-slide-up animate-scale-in"
              onClick={() => navigate('/student/login')}
              style={{ animationDelay: '120ms', animationFillMode: 'both' }}
            >
              <CardContent className="p-6 md:p-8 flex flex-col h-full">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
                  <GraduationCap className="w-7 h-7 text-blue-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Student
                </h2>
                <p className="text-slate-500 mb-6">
                  Submit and track your course modification requests
                </p>

                <ul className="space-y-3 mb-8 flex-grow">
                  {['Add, drop, or change courses', 'Track request status in real-time'].map((item, i) => (
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
              <CardContent className="p-6 md:p-8 flex flex-col h-full">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
                  <Users className="w-7 h-7 text-slate-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Registrar Staff
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

      <div 
        className={cn(
          "absolute bottom-8 w-full flex justify-center z-20 transition-opacity duration-300",
          isMobile ? "fixed" : "absolute"
        )}
        style={{ 
          opacity: Math.max(0, 1 - scrollY / (isMobile ? 500 : 700)),
          pointerEvents: scrollY > 500 ? 'none' : 'auto'
        }}
      >
        <div 
          className="cursor-pointer animate-bounce hover:text-blue-600 transition-colors bg-white/50 p-2 rounded-full backdrop-blur-sm md:bg-transparent md:p-0 md:backdrop-blur-none"
          onClick={scrollToReminder}
        >
          <ChevronDown className="w-10 h-10 text-slate-600 md:text-slate-400" />
        </div>
      </div>

      <div 
        className={cn(
          "fixed bottom-8 right-8 z-50 transition-all duration-300 transform",
          scrollY > 500 ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        )}
      >
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg p-0 flex items-center justify-center"
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
      </div>

      {/* Reminder Section */}
      <div 
        ref={reminderRef}
        className="min-h-screen bg-white relative z-10 py-24 px-4 flex flex-col items-center justify-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]"
      >
        <div className={cn(
          "max-w-5xl w-full transition-all duration-1000 transform",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}>
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-medium text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              Important Notice
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              ADC Fee Schedule 2026
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Please take note of the following schedule for Adding, Dropping, and Changing of subjects.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Period 1 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-green-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">January 19 - 28, 2026</h3>
                  <p className="text-green-700 font-medium">Early Adjustment Period</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between group hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-slate-700">Adding Subjects</span>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold">FREE</span>
                </div>

                <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between group hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <Banknote className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-slate-700">Dropping Subjects</span>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold">With Processing Fee</span>
                </div>

                <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between group hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <Banknote className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-slate-700">Changing Subjects</span>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold">With Processing Fee</span>
                </div>
              </div>
            </div>

            {/* Period 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">January 29 - February 4, 2026</h3>
                  <p className="text-blue-700 font-medium">Late Adjustment Period</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/60 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 group hover:bg-white transition-colors h-[180px]">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">All Transactions</h4>
                    <p className="text-slate-500 text-sm">Adding, Dropping, and Changing</p>
                  </div>
                  <span className="px-4 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold">
                    With Processing Fees
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADC Procedure Section */}
      <div 
        ref={guideRef}
        className="min-h-screen bg-[#F8F9FC] relative z-10 py-24 px-4 flex flex-col items-center justify-center"
      >
        <div className={cn(
          "max-w-5xl w-full transition-all duration-1000 transform",
          isGuideVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}>
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-medium text-sm mb-4">
              <Info className="w-4 h-4" />
              Step-by-Step Guide
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
              Procedure for Adding, Changing, and Dropping Courses (ADC)
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Follow these steps to ensure a smooth transaction for your ADC request.
            </p>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div 
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all duration-700 delay-100"
              style={{
                opacity: isGuideVisible ? 1 : 0,
                transform: isGuideVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl animate-pulse">
                  1
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">College Evaluation and Approval</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Visit your respective College office to have your ADC request evaluated and approved by the designated coordinator or dean. Bring any required supporting documents (e.g., class schedule, curriculum checklist, advising slip).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div 
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all duration-700 delay-200"
              style={{
                opacity: isGuideVisible ? 1 : 0,
                transform: isGuideVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl animate-pulse">
                  2
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">Registrar's Office Validation (Window 3)</h3>
                </div>
                <p className="text-slate-600 mb-4">Proceed to the Registrar's Office at Window 3 for:</p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span><span className="font-semibold text-slate-900">Validation</span> of your approved ADC request</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span><span className="font-semibold text-slate-900">Assessment</span> of fees (₱50.00 per course/subject to be dropped or changed)</span>
                  </li>
                </ul>
                <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium inline-block">
                  Note: Adding subjects does not incur additional fees at this stage.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div 
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all duration-700 delay-300"
              style={{
                opacity: isGuideVisible ? 1 : 0,
                transform: isGuideVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl animate-pulse">
                  3
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Banknote className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">Finance Office Payment</h3>
                </div>
                <p className="text-slate-600 mb-4">Go to the Finance Office to settle the assessed ADC fees. Ensure you:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span>Present the assessment slip from the Registrar's Office</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span>Keep your official receipt as proof of payment</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div 
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all duration-700 delay-[400ms]"
              style={{
                opacity: isGuideVisible ? 1 : 0,
                transform: isGuideVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl animate-pulse">
                  4
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">Submit Proof of Payment</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Return to the Registrar's Office (Window 3) and submit your official receipt from the Finance Office. This validates that you have completed the payment requirement.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div 
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all duration-700 delay-[500ms]"
              style={{
                opacity: isGuideVisible ? 1 : 0,
                transform: isGuideVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl animate-pulse">
                  5
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">ADC Management App Submission</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Access the ADC Management app and submit your ADC request electronically. Ensure all information is accurate before final submission.
                </p>
              </div>
            </div>

            {/* Step 6 */}
            <div 
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all duration-700 delay-[600ms]"
              style={{
                opacity: isGuideVisible ? 1 : 0,
                transform: isGuideVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl animate-pulse">
                  6
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <MonitorCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">Monitor and Verify</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span><span className="font-semibold text-slate-900">Check request status:</span> Regularly monitor the ADC Management app for updates on your request status</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span><span className="font-semibold text-slate-900">Verify final Study Load:</span> Once approved, check your student portal to confirm that your updated Study Load reflects all approved changes</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Important Reminders */}
            <div 
              className="bg-red-50 rounded-2xl p-6 md:p-8 border border-red-100 transition-all duration-700 delay-[700ms]"
              style={{
                opacity: isGuideVisible ? 1 : 0,
                transform: isGuideVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-bold text-red-900">Important Reminders</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Any discrepancies in your final Study Load should be reported immediately to the Registrar\'s Office',
                  'Keep copies of all receipts and approval documents for your records',
                  'Incomplete submissions or payments may result in delays or rejection of your ADC request'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-red-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white border-t border-slate-200 py-6">

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

export default RoleSelect;
