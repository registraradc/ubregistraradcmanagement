CREATE OR REPLACE FUNCTION public.get_request_queue_position(p_request_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      id,
      user_id,
      ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS pos
    FROM public.requests
    WHERE status IN ('pending', 'processing')
  )
  SELECT pos
  FROM ranked
  WHERE id = p_request_id
    AND (
      ranked.user_id = auth.uid()
      OR public.get_user_role(auth.uid()) = 'staff'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_request_queue_position(UUID) TO authenticated;
