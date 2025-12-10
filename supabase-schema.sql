-- Assembly Installer Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: assembly_parts
-- Stores basic information about assembly parts
-- ============================================
CREATE TABLE IF NOT EXISTS assembly_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  project_name TEXT,          -- PROJEKTI NIMI (kaust Trimblis)
  model_id TEXT NOT NULL,
  model_name TEXT,            -- MUDELI NIMI (faili nimi)
  object_id TEXT NOT NULL,
  mark TEXT,
  assembly TEXT,
  name TEXT,
  weight DECIMAL(10,2),
  phase TEXT,
  profile TEXT,
  material TEXT,
  length DECIMAL(10,2),
  guid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_part UNIQUE(project_id, model_id, object_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assembly_parts_project ON assembly_parts(project_id);
CREATE INDEX IF NOT EXISTS idx_assembly_parts_project_name ON assembly_parts(project_name);
CREATE INDEX IF NOT EXISTS idx_assembly_parts_model ON assembly_parts(model_id);
CREATE INDEX IF NOT EXISTS idx_assembly_parts_model_name ON assembly_parts(model_name);
CREATE INDEX IF NOT EXISTS idx_assembly_parts_mark ON assembly_parts(mark);
CREATE INDEX IF NOT EXISTS idx_assembly_parts_object ON assembly_parts(object_id);

-- ============================================
-- TABLE: installations
-- Tracks installation data for parts
-- ============================================
CREATE TABLE IF NOT EXISTS installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES assembly_parts(id) ON DELETE CASCADE,
  installers TEXT[] NOT NULL,
  date DATE NOT NULL,
  method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  
  -- Only one installation record per part
  CONSTRAINT unique_installation UNIQUE(part_id)
);

CREATE INDEX IF NOT EXISTS idx_installations_part ON installations(part_id);
CREATE INDEX IF NOT EXISTS idx_installations_date ON installations(date);
CREATE INDEX IF NOT EXISTS idx_installations_method ON installations(method);

-- ============================================
-- TABLE: deliveries
-- Tracks delivery data for parts
-- ============================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES assembly_parts(id) ON DELETE CASCADE,
  vehicle TEXT NOT NULL,
  date DATE NOT NULL,
  arrival_time TIME,
  unloading_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  
  -- Only one delivery record per part
  CONSTRAINT unique_delivery UNIQUE(part_id)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_part ON deliveries(part_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(date);
CREATE INDEX IF NOT EXISTS idx_deliveries_vehicle ON deliveries(vehicle);

-- ============================================
-- TABLE: boltings
-- Tracks bolting completion for parts
-- ============================================
CREATE TABLE IF NOT EXISTS boltings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES assembly_parts(id) ON DELETE CASCADE,
  installer TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  
  -- Only one bolting record per part
  CONSTRAINT unique_bolting UNIQUE(part_id)
);

CREATE INDEX IF NOT EXISTS idx_boltings_part ON boltings(part_id);
CREATE INDEX IF NOT EXISTS idx_boltings_date ON boltings(date);
CREATE INDEX IF NOT EXISTS idx_boltings_installer ON boltings(installer);

-- ============================================
-- TABLE: part_logs
-- Audit trail for all part changes
-- ============================================
CREATE TABLE IF NOT EXISTS part_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES assembly_parts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_part_logs_part ON part_logs(part_id);
CREATE INDEX IF NOT EXISTS idx_part_logs_timestamp ON part_logs(timestamp DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE assembly_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE boltings ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view parts" ON assembly_parts;
DROP POLICY IF EXISTS "Allow authenticated users to insert parts" ON assembly_parts;
DROP POLICY IF EXISTS "Allow authenticated users to update parts" ON assembly_parts;
DROP POLICY IF EXISTS "Allow authenticated users to delete parts" ON assembly_parts;

DROP POLICY IF EXISTS "Allow authenticated users to view installations" ON installations;
DROP POLICY IF EXISTS "Allow authenticated users to manage installations" ON installations;

DROP POLICY IF EXISTS "Allow authenticated users to view deliveries" ON deliveries;
DROP POLICY IF EXISTS "Allow authenticated users to manage deliveries" ON deliveries;

DROP POLICY IF EXISTS "Allow authenticated users to view boltings" ON boltings;
DROP POLICY IF EXISTS "Allow authenticated users to manage boltings" ON boltings;

DROP POLICY IF EXISTS "Allow authenticated users to view logs" ON part_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON part_logs;

-- assembly_parts policies
CREATE POLICY "Allow authenticated users to view parts" 
  ON assembly_parts FOR SELECT 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to insert parts" 
  ON assembly_parts FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to update parts" 
  ON assembly_parts FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to delete parts" 
  ON assembly_parts FOR DELETE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- installations policies
CREATE POLICY "Allow authenticated users to view installations" 
  ON installations FOR SELECT 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to manage installations" 
  ON installations FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- deliveries policies
CREATE POLICY "Allow authenticated users to view deliveries" 
  ON deliveries FOR SELECT 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to manage deliveries" 
  ON deliveries FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- boltings policies
CREATE POLICY "Allow authenticated users to view boltings" 
  ON boltings FOR SELECT 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to manage boltings" 
  ON boltings FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- part_logs policies
CREATE POLICY "Allow authenticated users to view logs" 
  ON part_logs FOR SELECT 
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to insert logs" 
  ON part_logs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on assembly_parts
DROP TRIGGER IF EXISTS update_assembly_parts_updated_at ON assembly_parts;
CREATE TRIGGER update_assembly_parts_updated_at
    BEFORE UPDATE ON assembly_parts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS for easier querying
-- ============================================

-- View: parts_with_status
-- Combines parts with their installation, delivery, and bolting status
CREATE OR REPLACE VIEW parts_with_status AS
SELECT 
  p.*,
  CASE WHEN i.id IS NOT NULL THEN true ELSE false END as is_installed,
  CASE WHEN d.id IS NOT NULL THEN true ELSE false END as is_delivered,
  CASE WHEN b.id IS NOT NULL THEN true ELSE false END as is_bolted,
  i.date as installation_date,
  d.date as delivery_date,
  b.date as bolting_date
FROM assembly_parts p
LEFT JOIN installations i ON p.id = i.part_id
LEFT JOIN deliveries d ON p.id = d.part_id
LEFT JOIN boltings b ON p.id = b.part_id;

-- ============================================
-- SAMPLE DATA (for testing, remove in production)
-- ============================================

-- Uncomment to insert sample data
/*
INSERT INTO assembly_parts (project_id, model_id, object_id, mark, assembly, name, weight, phase)
VALUES 
  ('test-project', 'test-model', 'obj-1', 'BM-1', 'ASM-001', 'Main Beam', 250.5, 'Phase 1'),
  ('test-project', 'test-model', 'obj-2', 'COL-1', 'ASM-001', 'Column', 180.0, 'Phase 1'),
  ('test-project', 'test-model', 'obj-3', 'BM-2', 'ASM-002', 'Secondary Beam', 150.0, 'Phase 2');
*/

-- ============================================
-- GRANTS (if using service role)
-- ============================================

-- Grant necessary permissions to authenticated role
GRANT ALL ON assembly_parts TO authenticated;
GRANT ALL ON installations TO authenticated;
GRANT ALL ON deliveries TO authenticated;
GRANT ALL ON boltings TO authenticated;
GRANT ALL ON part_logs TO authenticated;

-- Grant permissions to anon role (for public access if needed)
GRANT SELECT, INSERT, UPDATE ON assembly_parts TO anon;
GRANT ALL ON installations TO anon;
GRANT ALL ON deliveries TO anon;
GRANT ALL ON boltings TO anon;
GRANT SELECT, INSERT ON part_logs TO anon;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Assembly Installer database schema created successfully!';
  RAISE NOTICE '📊 Tables: assembly_parts, installations, deliveries, boltings, part_logs';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '📈 Indexes and views created';
END $$;
