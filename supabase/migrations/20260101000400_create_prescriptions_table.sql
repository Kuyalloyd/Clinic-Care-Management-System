CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  staff_id UUID,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(50) NOT NULL,
  unit VARCHAR(50) NOT NULL CHECK (unit IN ('mg', 'ml', 'g', 'mcg', 'IU')),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  instructions TEXT,
  refills INTEGER DEFAULT 0,
  prescribed_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS prescriptions_patient_id_idx ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS prescriptions_staff_id_idx ON prescriptions(staff_id);
CREATE INDEX IF NOT EXISTS prescriptions_expiry_date_idx ON prescriptions(expiry_date);
