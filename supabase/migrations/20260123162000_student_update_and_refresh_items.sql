-- Allow students to update their own pending requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'requests'
      AND policyname = 'Students can update pending requests'
  ) THEN
    EXECUTE 'DROP POLICY "Students can update pending requests" ON public.requests';
  END IF;
END $$;

CREATE POLICY "Students can update pending requests" ON public.requests
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
    AND public.get_user_role(auth.uid()) = 'student'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND public.get_user_role(auth.uid()) = 'student'
  );

-- Refresh request_items when a pending request is updated
CREATE OR REPLACE FUNCTION public.refresh_request_items_from_request_data()
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
  IF NEW.status = 'pending' THEN
    DELETE FROM public.request_items WHERE request_id = NEW.id;

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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_request_items_after_request_update ON public.requests;
CREATE TRIGGER refresh_request_items_after_request_update
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_request_items_from_request_data();
