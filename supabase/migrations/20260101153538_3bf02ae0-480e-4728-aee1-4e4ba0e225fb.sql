-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('student', 'staff');

-- Create enum for request types
CREATE TYPE public.request_type AS ENUM ('add', 'change', 'drop', 'change_year_level');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'processing', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role user_role NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create requests table
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  id_number TEXT NOT NULL,
  college TEXT NOT NULL,
  program TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  suffix TEXT,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  facebook TEXT,
  request_type request_type NOT NULL,
  request_data JSONB NOT NULL DEFAULT '{}',
  status request_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, request_type)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = p_user_id;
$$;

-- Requests policies for students
CREATE POLICY "Students can view own requests" ON public.requests
  FOR SELECT USING (
    auth.uid() = user_id OR 
    public.get_user_role(auth.uid()) = 'staff'
  );

CREATE POLICY "Students can insert own requests" ON public.requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    public.get_user_role(auth.uid()) = 'student'
  );

CREATE POLICY "Students can delete pending requests" ON public.requests
  FOR DELETE USING (
    auth.uid() = user_id AND 
    status = 'pending'
  );

CREATE POLICY "Staff can update requests" ON public.requests
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'staff'
  );

-- Enable realtime for requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();