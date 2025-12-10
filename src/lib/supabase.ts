import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types matching Supabase schema
export interface DbAssemblyPart {
  id: string;
  project_id: string;
  project_name?: string;      // PROJEKTI NIMI (kausta nimi Trimblis)
  model_id: string;
  model_name?: string;         // MUDELI NIMI (faili nimi)
  object_id: string;
  mark?: string;
  assembly?: string;
  name?: string;
  weight?: number;
  phase?: string;
  profile?: string;
  material?: string;
  length?: number;
  guid?: string;
  created_at: string;
  updated_at: string;
}

export interface DbInstallation {
  id: string;
  part_id: string;
  installers: string[];
  date: string;
  method: string;
  created_at: string;
  created_by: string;
}

export interface DbDelivery {
  id: string;
  part_id: string;
  vehicle: string;
  date: string;
  arrival_time?: string;
  unloading_time?: string;
  created_at: string;
  created_by: string;
}

export interface DbBolting {
  id: string;
  part_id: string;
  installer: string;
  date: string;
  created_at: string;
  created_by: string;
}

export interface DbPartLog {
  id: string;
  part_id: string;
  action: string;
  user_name: string;
  timestamp: string;
}

// Combined type for parts with relations
export interface DbPartWithRelations extends DbAssemblyPart {
  installation?: DbInstallation;
  delivery?: DbDelivery;
  bolting?: DbBolting;
  logs?: DbPartLog[];
}
