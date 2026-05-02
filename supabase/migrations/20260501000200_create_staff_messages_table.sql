CREATE TABLE IF NOT EXISTS public.staff_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  recipient_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_messages_sender_idx
  ON public.staff_messages(sender_staff_id);

CREATE INDEX IF NOT EXISTS staff_messages_recipient_idx
  ON public.staff_messages(recipient_staff_id);

CREATE INDEX IF NOT EXISTS staff_messages_patient_idx
  ON public.staff_messages(patient_id);

CREATE INDEX IF NOT EXISTS staff_messages_created_at_idx
  ON public.staff_messages(created_at DESC);
