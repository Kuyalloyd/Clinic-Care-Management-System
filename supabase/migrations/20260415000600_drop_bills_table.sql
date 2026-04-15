-- Drop bills table and related RLS policies
DROP POLICY IF EXISTS "bills_select_policy" ON bills;
DROP POLICY IF EXISTS "bills_insert_policy" ON bills;
DROP POLICY IF EXISTS "bills_update_policy" ON bills;
DROP POLICY IF EXISTS "bills_delete_policy" ON bills;

DROP TABLE IF EXISTS bills;

notify pgrst, 'reload schema';
