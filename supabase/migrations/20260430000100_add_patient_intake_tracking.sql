ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS recommended_doctor_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intake_notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS patients_recommended_doctor_idx
  ON public.patients(recommended_doctor_id);

CREATE INDEX IF NOT EXISTS patients_created_by_staff_idx
  ON public.patients(created_by_staff_id);

CREATE INDEX IF NOT EXISTS patients_updated_by_staff_idx
  ON public.patients(updated_by_staff_id);
