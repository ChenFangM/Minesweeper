import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create the Supabase client with additional options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Use PKCE flow for better security and redirect handling
  },
  global: {
    headers: {
      'x-application-name': 'minesweeps'
    }
  }
});

// Handle auth state change from URL
export const handleAuthFromUrl = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return false;
    }
    
    // Check if we have hash parameters that might contain auth info
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.has('access_token') || hashParams.has('refresh_token') || hashParams.has('type')) {
        console.log('Found auth params in URL, processing...');
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user from URL params:', error);
          return false;
        }
        return true;
      }
    }
    
    return !!data.session;
  } catch (err) {
    console.error('Error handling auth from URL:', err);
    return false;
  }
};

// Helper function to check if Supabase is properly configured
export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
    return false;
  }
};
