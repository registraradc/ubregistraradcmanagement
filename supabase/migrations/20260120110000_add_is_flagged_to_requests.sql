-- Add is_flagged column to requests table
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
