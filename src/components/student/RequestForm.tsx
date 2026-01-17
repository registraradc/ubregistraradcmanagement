import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { colleges, getProgramsByCollege } from '@/lib/colleges';
import { useMediaQuery } from '@/hooks/use-mobile';
 import AddRequestDialog from './dialogs/AddRequestDialog';
 import ChangeRequestDialog from './dialogs/ChangeRequestDialog';
 import DropRequestDialog from './dialogs/DropRequestDialog';
 import AddRequestExceptionDialog from './dialogs/AddRequestExceptionDialog';

interface RequestFormProps {
  onSubmitSuccess: () => void;
}

export interface FormData {
  idNumber: string;
  college: string;
  program: string;
  lastName: string;
  firstName: string;
  middleName: string;
  suffix: string;
  email: string;
  phoneNumber: string;
  facebook: string;
  requestType: 'add' | 'add_with_exception' | 'change' | 'drop' | '';
}

const RequestForm = ({ onSubmitSuccess }: RequestFormProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [formData, setFormData] = useState<FormData>({
    idNumber: '',
    college: '',
    program: '',
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    email: '',
    phoneNumber: '',
    facebook: '',
    requestType: '',
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddExceptionDialog, setShowAddExceptionDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showDropDialog, setShowDropDialog] = useState(false);

  const programs = formData.college ? getProgramsByCollege(formData.college) : [];

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'college') {
      setFormData(prev => ({ ...prev, program: '' }));
    }
  };

  const isFormValid = () => {
    return (
      formData.idNumber &&
      formData.college &&
      formData.program &&
      formData.lastName &&
      formData.firstName &&
      formData.email &&
      formData.phoneNumber &&
      formData.requestType
    );
  };

  const handleProceed = () => {
    if (!isFormValid()) return;

    switch (formData.requestType) {
      case 'add':
        setShowAddDialog(true);
        break;
      case 'add_with_exception':
        setShowAddExceptionDialog(true);
        break;
      case 'change':
        setShowChangeDialog(true);
        break;
      case 'drop':
        setShowDropDialog(true);
        break;
    }
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setShowAddExceptionDialog(false);
    setShowChangeDialog(false);
    setShowDropDialog(false);
  };

  const handleSuccess = () => {
    handleDialogClose();
    setFormData({
      idNumber: '',
      college: '',
      program: '',
      lastName: '',
      firstName: '',
      middleName: '',
      suffix: '',
      email: '',
      phoneNumber: '',
      facebook: '',
      requestType: '',
    });
    onSubmitSuccess();
  };

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">New Request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number *</Label>
              <Input
                id="idNumber"
                placeholder="e.g., 26-0123-456"
                value={formData.idNumber}
                onChange={(e) => handleInputChange('idNumber', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College *</Label>
              <Select value={formData.college} onValueChange={(v) => handleInputChange('college', v)}>
                <SelectTrigger className="input-focus">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {colleges.map((college) => (
                    <SelectItem key={college.abbreviation} value={college.name}>
                      {isMobile ? college.abbreviation : college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Program *</Label>
              <Select 
                value={formData.program} 
                onValueChange={(v) => handleInputChange('program', v)}
                disabled={!formData.college}
              >
                <SelectTrigger className="input-focus">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-60">
                  {programs.map((program) => (
                    <SelectItem key={program} value={program}>
                      {program}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Dela Cruz"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Juan"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                placeholder="Santos"
                value={formData.middleName}
                onChange={(e) => handleInputChange('middleName', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                placeholder="Jr., Sr., III"
                value={formData.suffix}
                onChange={(e) => handleInputChange('suffix', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jsdelacruz@universityofbohol.edu.ph"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                placeholder="09123456789"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                placeholder="facebook.com/username"
                value={formData.facebook}
                onChange={(e) => handleInputChange('facebook', e.target.value)}
                className="input-focus"
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label htmlFor="requestType">Request Type *</Label>
              <Select 
                value={formData.requestType} 
                onValueChange={(v) => handleInputChange('requestType', v as FormData['requestType'])}
              >
                <SelectTrigger className="input-focus">
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="add">
                    <div className="flex flex-col">
                      <span>Add Course</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="add_with_exception">
                    <div className="flex flex-col">
                      <span>Add Course with Exception</span>
                      <span className="text-xs text-muted-foreground">
                        Note: you need to see the Registrar for this request.
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="change">Change Course</SelectItem>
                  <SelectItem value="drop">Drop Course</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleProceed}
            disabled={!isFormValid()}
            variant="gradient"
            size="lg"
            className="w-full mt-6"
          >
            Proceed
          </Button>
        </CardContent>
      </Card>

      <AddRequestDialog 
        open={showAddDialog} 
        onClose={handleDialogClose}
        formData={formData}
        onSuccess={handleSuccess}
      />
      <AddRequestExceptionDialog
        open={showAddExceptionDialog}
        onClose={handleDialogClose}
        formData={formData}
        onSuccess={handleSuccess}
      />
      <ChangeRequestDialog 
        open={showChangeDialog} 
        onClose={handleDialogClose}
        formData={formData}
        onSuccess={handleSuccess}
      />
       <DropRequestDialog 
         open={showDropDialog} 
         onClose={handleDialogClose}
         formData={formData}
         onSuccess={handleSuccess}
       />
    </>
  );
};

export default RequestForm;
