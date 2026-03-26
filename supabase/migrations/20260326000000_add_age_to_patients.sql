-- Add age column and trigger to update it automatically
-- Age is calculated from date_of_birth

ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;

-- Create function to calculate age from date_of_birth
CREATE OR REPLACE FUNCTION calculate_patient_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := EXTRACT(YEAR FROM AGE(NEW.date_of_birth))::INTEGER;
  ELSE
    NEW.age := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS patients_age_trigger ON patients;

-- Create trigger to update age on insert or update
CREATE TRIGGER patients_age_trigger
BEFORE INSERT OR UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION calculate_patient_age();

-- Update existing rows with age
UPDATE patients SET date_of_birth = date_of_birth WHERE date_of_birth IS NOT NULL;

-- Create index on age for faster queries
CREATE INDEX IF NOT EXISTS patients_age_idx ON patients(age);
