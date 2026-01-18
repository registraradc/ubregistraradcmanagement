DO $$
BEGIN
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'partially_approved';
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.request_item_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.request_item_action AS ENUM ('add', 'drop');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  group_id UUID,
  action public.request_item_action NOT NULL,
  course_code TEXT NOT NULL,
  descriptive_title TEXT,
  section_code TEXT,
  time TEXT,
  day TEXT,
  status public.request_item_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students and staff can view request items" ON public.request_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND (
          r.user_id = auth.uid()
          OR public.get_user_role(auth.uid()) = 'staff'
        )
    )
  );

CREATE POLICY "Students can insert own request items" ON public.request_items
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'student'
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update request items" ON public.request_items
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'staff'
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.request_items;

CREATE OR REPLACE FUNCTION public.create_request_items_from_request_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course jsonb;
  v_old jsonb;
  v_new jsonb;
  v_len int;
  v_i int;
  v_group_id uuid;
BEGIN
  IF NEW.request_type IN ('add', 'drop', 'add_with_exception') THEN
    FOR v_course IN
      SELECT value FROM jsonb_array_elements(COALESCE(NEW.request_data->'courses', '[]'::jsonb))
    LOOP
      INSERT INTO public.request_items (
        request_id,
        action,
        course_code,
        descriptive_title,
        section_code,
        time,
        day
      )
      VALUES (
        NEW.id,
        (CASE WHEN NEW.request_type = 'drop' THEN 'drop' ELSE 'add' END)::public.request_item_action,
        COALESCE(v_course->>'courseCode', ''),
        NULLIF(v_course->>'descriptiveTitle', ''),
        NULLIF(v_course->>'sectionCode', ''),
        NULLIF(v_course->>'time', ''),
        NULLIF(v_course->>'day', '')
      );
    END LOOP;
  ELSIF NEW.request_type = 'change' THEN
    v_len := GREATEST(
      jsonb_array_length(COALESCE(NEW.request_data->'oldCourses', '[]'::jsonb)),
      jsonb_array_length(COALESCE(NEW.request_data->'newCourses', '[]'::jsonb))
    );

    v_i := 0;
    WHILE v_i < v_len LOOP
      v_group_id := gen_random_uuid();
      v_old := COALESCE((NEW.request_data->'oldCourses')->v_i, '{}'::jsonb);
      v_new := COALESCE((NEW.request_data->'newCourses')->v_i, '{}'::jsonb);

      INSERT INTO public.request_items (
        request_id,
        group_id,
        action,
        course_code
      )
      VALUES (
        NEW.id,
        v_group_id,
        'drop'::public.request_item_action,
        COALESCE(v_old->>'courseCode', '')
      );

      INSERT INTO public.request_items (
        request_id,
        group_id,
        action,
        course_code,
        descriptive_title,
        section_code,
        time,
        day
      )
      VALUES (
        NEW.id,
        v_group_id,
        'add'::public.request_item_action,
        COALESCE(v_new->>'courseCode', ''),
        NULLIF(v_new->>'descriptiveTitle', ''),
        NULLIF(v_new->>'sectionCode', ''),
        NULLIF(v_new->>'time', ''),
        NULLIF(v_new->>'day', '')
      );

      v_i := v_i + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_request_items_after_request_insert ON public.requests;
CREATE TRIGGER create_request_items_after_request_insert
  AFTER INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_request_items_from_request_data();

CREATE OR REPLACE FUNCTION public.backfill_request_items(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_type public.request_type;
  v_request_data jsonb;
  v_course jsonb;
  v_old jsonb;
  v_new jsonb;
  v_len int;
  v_i int;
  v_group_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.request_items WHERE request_id = p_request_id) THEN
    RETURN;
  END IF;

  SELECT request_type, request_data
  INTO v_request_type, v_request_data
  FROM public.requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  IF v_request_type IN ('add', 'drop', 'add_with_exception') THEN
    FOR v_course IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_request_data->'courses', '[]'::jsonb))
    LOOP
      INSERT INTO public.request_items (
        request_id,
        action,
        course_code,
        descriptive_title,
        section_code,
        time,
        day
      )
      VALUES (
        p_request_id,
        (CASE WHEN v_request_type = 'drop' THEN 'drop' ELSE 'add' END)::public.request_item_action,
        COALESCE(v_course->>'courseCode', ''),
        NULLIF(v_course->>'descriptiveTitle', ''),
        NULLIF(v_course->>'sectionCode', ''),
        NULLIF(v_course->>'time', ''),
        NULLIF(v_course->>'day', '')
      );
    END LOOP;
  ELSIF v_request_type = 'change' THEN
    v_len := GREATEST(
      jsonb_array_length(COALESCE(v_request_data->'oldCourses', '[]'::jsonb)),
      jsonb_array_length(COALESCE(v_request_data->'newCourses', '[]'::jsonb))
    );

    v_i := 0;
    WHILE v_i < v_len LOOP
      v_group_id := gen_random_uuid();
      v_old := COALESCE((v_request_data->'oldCourses')->v_i, '{}'::jsonb);
      v_new := COALESCE((v_request_data->'newCourses')->v_i, '{}'::jsonb);

      INSERT INTO public.request_items (
        request_id,
        group_id,
        action,
        course_code
      )
      VALUES (
        p_request_id,
        v_group_id,
        'drop'::public.request_item_action,
        COALESCE(v_old->>'courseCode', '')
      );

      INSERT INTO public.request_items (
        request_id,
        group_id,
        action,
        course_code,
        descriptive_title,
        section_code,
        time,
        day
      )
      VALUES (
        p_request_id,
        v_group_id,
        'add'::public.request_item_action,
        COALESCE(v_new->>'courseCode', ''),
        NULLIF(v_new->>'descriptiveTitle', ''),
        NULLIF(v_new->>'sectionCode', ''),
        NULLIF(v_new->>'time', ''),
        NULLIF(v_new->>'day', '')
      );

      v_i := v_i + 1;
    END LOOP;
  END IF;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT req.id
    FROM public.requests req
    WHERE req.request_type IN ('add', 'drop', 'add_with_exception', 'change')
      AND NOT EXISTS (
        SELECT 1
        FROM public.request_items ri
        WHERE ri.request_id = req.id
      )
  LOOP
    PERFORM public.backfill_request_items(r.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_request_decisions(
  p_request_id UUID,
  p_item_decisions JSONB,
  p_request_remarks TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_approved INT;
  v_rejected INT;
  v_decision JSONB;
BEGIN
  IF public.get_user_role(auth.uid()) <> 'staff' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.requests
  SET processed_at = COALESCE(processed_at, now())
  WHERE id = p_request_id;

  FOR v_decision IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_item_decisions, '[]'::jsonb))
  LOOP
    UPDATE public.request_items
    SET
      status = (v_decision->>'status')::public.request_item_status,
      remarks = NULLIF(v_decision->>'remarks', ''),
      decided_at = now(),
      decided_by = auth.uid()
    WHERE id = (v_decision->>'id')::uuid
      AND request_id = p_request_id;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.request_items
    WHERE request_id = p_request_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'all items must be decided';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.request_items
    WHERE request_id = p_request_id
      AND group_id IS NOT NULL
    GROUP BY group_id
    HAVING COUNT(DISTINCT status) > 1
  ) THEN
    RAISE EXCEPTION 'group decision mismatch';
  END IF;

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE status = 'approved')::int,
    COUNT(*) FILTER (WHERE status = 'rejected')::int
  INTO v_total, v_approved, v_rejected
  FROM public.request_items
  WHERE request_id = p_request_id;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'request has no items';
  END IF;

  IF v_approved = v_total THEN
    UPDATE public.requests
    SET status = 'approved', remarks = p_request_remarks, completed_at = now()
    WHERE id = p_request_id;
  ELSIF v_rejected = v_total THEN
    UPDATE public.requests
    SET status = 'rejected', remarks = p_request_remarks, completed_at = now()
    WHERE id = p_request_id;
  ELSE
    UPDATE public.requests
    SET status = 'partially_approved', remarks = p_request_remarks, completed_at = now()
    WHERE id = p_request_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_request_decisions(UUID, JSONB, TEXT) TO authenticated;

