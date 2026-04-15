
-- Create a function for clinical/care staff who need access to resident medical data
CREATE OR REPLACE FUNCTION public.is_care_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'coordinador', 'enfermera', 'cuidadora', 'terapeuta', 'psicologo')
  )
$$;

-- Create a function for admin/operational staff
CREATE OR REPLACE FUNCTION public.is_admin_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'coordinador', 'administrativo')
  )
$$;

-- ============================================
-- Update SELECT policies on sensitive medical/clinical tables
-- Replace is_staff() with is_care_staff() for medical tables
-- ============================================

-- daily_logs: restrict to care staff
DROP POLICY IF EXISTS "Staff can view logs" ON public.daily_logs;
CREATE POLICY "Care staff can view logs" ON public.daily_logs
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()));

DROP POLICY IF EXISTS "Care staff can manage logs" ON public.daily_logs;
CREATE POLICY "Care staff can manage logs" ON public.daily_logs
FOR ALL TO authenticated USING (is_care_staff(auth.uid()));

-- nursing_notes: already restricted to nurses+, SELECT needs tightening
DROP POLICY IF EXISTS "Staff can view notes" ON public.nursing_notes;
CREATE POLICY "Care staff can view notes" ON public.nursing_notes
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()));

-- incidents: restrict to care staff
DROP POLICY IF EXISTS "Staff can view incidents" ON public.incidents;
CREATE POLICY "Care staff can view incidents" ON public.incidents
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage incidents" ON public.incidents;
CREATE POLICY "Care staff can manage incidents" ON public.incidents
FOR ALL TO authenticated USING (is_care_staff(auth.uid()));

-- document_attachments: restrict to care + admin staff
DROP POLICY IF EXISTS "Staff can view attachments" ON public.document_attachments;
CREATE POLICY "Authorized staff can view attachments" ON public.document_attachments
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()) OR is_admin_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage attachments" ON public.document_attachments;
CREATE POLICY "Authorized staff can manage attachments" ON public.document_attachments
FOR ALL TO authenticated USING (is_care_staff(auth.uid()) OR is_admin_staff(auth.uid()));

-- hygiene_kits: restrict to care staff
DROP POLICY IF EXISTS "Staff can view hygiene kits" ON public.hygiene_kits;
CREATE POLICY "Care staff can view hygiene kits" ON public.hygiene_kits
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage hygiene kits" ON public.hygiene_kits;
CREATE POLICY "Care staff can manage hygiene kits" ON public.hygiene_kits
FOR ALL TO authenticated USING (is_care_staff(auth.uid()));

-- profiles: care + admin staff can view (needed for UI lookups)
-- Keep broad access since profiles contain only names/phones

-- admission_checklists: already restricted to coordinador+ for management, tighten SELECT
DROP POLICY IF EXISTS "Staff can view checklists" ON public.admission_checklists;
CREATE POLICY "Care staff can view checklists" ON public.admission_checklists
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()));

-- belongings_inventory: already restricted to coordinador+ for management, tighten SELECT
DROP POLICY IF EXISTS "Staff can view inventory" ON public.belongings_inventory;
CREATE POLICY "Care staff can view inventory" ON public.belongings_inventory
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()) OR is_admin_staff(auth.uid()));

-- companion_authorizations: tighten SELECT
DROP POLICY IF EXISTS "Staff can view authorizations" ON public.companion_authorizations;
CREATE POLICY "Care staff can view authorizations" ON public.companion_authorizations
FOR SELECT TO authenticated USING (is_care_staff(auth.uid()));

-- Keep food-related tables with is_staff() since manipuladora needs access
-- food_intake_records, fridge_temps, kitchen_checklists, disinfection_records — no changes needed
