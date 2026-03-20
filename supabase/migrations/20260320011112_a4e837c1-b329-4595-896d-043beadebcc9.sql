
-- Blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  excerpt text,
  featured_image_url text,
  category text DEFAULT 'general',
  status text DEFAULT 'borrador',
  published_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage blog" ON public.blog_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Staff can view blog" ON public.blog_posts FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Social media posts table
CREATE TABLE IF NOT EXISTS public.social_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platforms jsonb DEFAULT '[]',
  scheduled_at timestamptz,
  published_at timestamptz,
  content_text text NOT NULL DEFAULT '',
  media_urls jsonb DEFAULT '[]',
  hashtags text,
  status text DEFAULT 'borrador',
  ai_generated boolean DEFAULT false,
  api_response jsonb DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage social" ON public.social_media_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));

-- Payment vouchers table
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  provider_name text NOT NULL,
  provider_document text,
  provider_role text,
  provider_bank text,
  provider_account text,
  items jsonb DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  retentions numeric DEFAULT 0,
  net_paid numeric DEFAULT 0,
  payment_method text DEFAULT 'transferencia',
  status text DEFAULT 'pendiente',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage vouchers" ON public.payment_vouchers FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Coord can view vouchers" ON public.payment_vouchers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coordinador'));

-- Waste management (PEGIR) HB-G01
CREATE TABLE IF NOT EXISTS public.waste_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  responsible text,
  classification_data jsonb DEFAULT '[]',
  storage_data jsonb DEFAULT '[]',
  disposal_data jsonb DEFAULT '[]',
  observations text,
  signature_responsible text,
  signature_coordinator text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.waste_management ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages waste" ON public.waste_management FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Coord views waste" ON public.waste_management FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coordinador'));

-- Pest control HB-G02
CREATE TABLE IF NOT EXISTS public.pest_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_quarter integer NOT NULL,
  period_year integer NOT NULL,
  company_name text,
  company_nit text,
  company_license text,
  schedule_data jsonb DEFAULT '[]',
  monitoring_data jsonb DEFAULT '[]',
  certificates jsonb DEFAULT '{}',
  observations text,
  signature_responsible text,
  signature_coordinator text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pest_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages pest" ON public.pest_control FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Coord views pest" ON public.pest_control FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coordinador'));

-- Hazardous waste (RESPEL) HB-G03
CREATE TABLE IF NOT EXISTS public.hazardous_waste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  responsible text,
  inventory_data jsonb DEFAULT '[]',
  compliance_checks jsonb DEFAULT '{}',
  disposal_records jsonb DEFAULT '[]',
  incidents jsonb DEFAULT '[]',
  signature_responsible text,
  signature_coordinator text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hazardous_waste ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages hazwaste" ON public.hazardous_waste FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Coord views hazwaste" ON public.hazardous_waste FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coordinador'));

-- Sanitation HB-G04
CREATE TABLE IF NOT EXISTS public.sanitation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  responsible text,
  water_tests jsonb DEFAULT '[]',
  wastewater_systems jsonb DEFAULT '[]',
  sanitary_conditions jsonb DEFAULT '[]',
  legionella_data jsonb DEFAULT '[]',
  observations text,
  signature_responsible text,
  signature_coordinator text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sanitation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages sanitation" ON public.sanitation_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'administrativo'));
CREATE POLICY "Coord views sanitation" ON public.sanitation_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coordinador'));

-- Emergency plan HB-G05
CREATE TABLE IF NOT EXISTS public.emergency_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_semester integer NOT NULL,
  period_year integer NOT NULL,
  responsible text,
  brigade_members jsonb DEFAULT '[]',
  drills jsonb DEFAULT '[]',
  equipment_inspections jsonb DEFAULT '[]',
  evacuation_routes jsonb DEFAULT '{}',
  emergency_numbers jsonb DEFAULT '{}',
  action_plan text,
  signature_responsible text,
  signature_coordinator text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages emergency" ON public.emergency_plans FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'coordinador'));
CREATE POLICY "Staff views emergency" ON public.emergency_plans FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Therapy sessions for enhanced HB-F9
CREATE TABLE IF NOT EXISTS public.therapy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapy_name text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  session_time time,
  days_of_week jsonb DEFAULT '[]',
  frequency text DEFAULT 'semanal',
  attendees jsonb DEFAULT '[]',
  observations text,
  photos jsonb DEFAULT '[]',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Therapists manage sessions" ON public.therapy_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'coordinador') OR has_role(auth.uid(), 'terapeuta') OR has_role(auth.uid(), 'psicologo'));
CREATE POLICY "Staff views sessions" ON public.therapy_sessions FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Add manipuladora role if not exists (idempotent check via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manipuladora' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'manipuladora';
  END IF;
END $$;
