-- Drop the unique constraint that prevents multiple requests of the same type per user
-- The application logic already checks for pending/processing requests before allowing new submissions
ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_user_id_request_type_key;