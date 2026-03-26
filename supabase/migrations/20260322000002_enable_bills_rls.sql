ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bills_select_policy" ON bills;
DROP POLICY IF EXISTS "bills_insert_policy" ON bills;
DROP POLICY IF EXISTS "bills_update_policy" ON bills;
DROP POLICY IF EXISTS "bills_delete_policy" ON bills;

CREATE POLICY "bills_select_policy" ON bills
  FOR SELECT USING (true);

CREATE POLICY "bills_insert_policy" ON bills
  FOR INSERT WITH CHECK (true);

CREATE POLICY "bills_update_policy" ON bills
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "bills_delete_policy" ON bills
  FOR DELETE USING (true);
