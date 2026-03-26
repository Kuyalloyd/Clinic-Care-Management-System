CREATE OR REPLACE FUNCTION get_all_staff()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  phone TEXT,
  specialty TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.email,
    s.full_name,
    s.role,
    s.phone,
    s.specialty,
    s.created_at
  FROM staff s
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_staff() TO authenticated;

ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
