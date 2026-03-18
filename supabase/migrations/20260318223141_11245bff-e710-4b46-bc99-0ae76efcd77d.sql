-- Fix permissive audit_log insert policy
DROP POLICY "System can insert audit" ON public.audit_log;
CREATE POLICY "Staff can insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = user_id);