ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON appointments FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;

ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON prescriptions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prescriptions TO authenticated;

ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON reports FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO authenticated;
