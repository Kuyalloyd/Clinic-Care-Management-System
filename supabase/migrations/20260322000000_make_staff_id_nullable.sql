ALTER TABLE prescriptions 
DROP CONSTRAINT IF EXISTS prescriptions_staff_id_fkey;

ALTER TABLE prescriptions 
ALTER COLUMN staff_id DROP NOT NULL;

ALTER TABLE prescriptions 
ADD CONSTRAINT prescriptions_staff_id_fkey 
FOREIGN KEY (staff_id) 
REFERENCES staff(id) 
ON DELETE SET NULL;
