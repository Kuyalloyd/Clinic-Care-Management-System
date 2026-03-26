CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  report_type VARCHAR(100),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS reports_patient_id_idx ON reports(patient_id);
CREATE INDEX IF NOT EXISTS reports_staff_id_idx ON reports(staff_id);
CREATE INDEX IF NOT EXISTS reports_type_idx ON reports(report_type);
