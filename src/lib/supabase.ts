import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptgdpcyfrufkhtflbaus.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Z2RwY3lmcnVma2h0ZmxiYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNzQ5MDMsImV4cCI6MjA1OTc1MDkwM30.hYXKPkhozRHM2WaQGkPZjrNWxNExfhKcUsYNIh_mhfk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
