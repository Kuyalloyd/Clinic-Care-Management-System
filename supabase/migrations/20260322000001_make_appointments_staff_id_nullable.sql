ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey;

ALTER TABLE appointments 
ALTER COLUMN staff_id DROP NOT NULL;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_staff_id_fkey 
FOREIGN KEY (staff_id) 
REFERENCES staff(id) 
ON DELETE SET NULL;
