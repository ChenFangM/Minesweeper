import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, handleAuthFromUrl } from './supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: { user: User | null; session: Session | null } | null;
  }>;
  signUp: (email: string, password: string) => Promise<{
    error: Error | null;
    data: { user: User | null; session: Session | null } | null;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      
      // Check if we're coming from an email confirmation link
      const isFromEmailLink = await handleAuthFromUrl();
      if (isFromEmailLink) {
        console.log('Successfully processed auth from URL');
      }
      
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };
    
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    try {
      // First, check if the user already exists to provide a better error message
      const { data: existingUser } = await supabase.auth.signInWithPassword({ 
        email, 
        password: password + '_dummy_suffix' // Use a modified password to avoid actually logging in
      });
      
      // If we got a user back, the email exists (despite the wrong password)
      if (existingUser?.user) {
        return {
          error: new Error('This email is already registered'),
          data: null
        };
      }
      
      // Attempt the signup with proper redirect URL and disable auto-confirmation
      const result = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: '',
            avatar_url: ''
          }
        }
      });
      
      // If there's an error in the auth process, return it immediately
      if (result.error) {
        console.error('Auth signup error:', result.error);
        
        // Provide a more user-friendly message for the 500 error
        if (result.error.status === 500) {
          return {
            error: new Error('The authentication service is currently unavailable. Please try again later.'),
            data: null
          };
        }
        
        return result;
      }
      
      // If signup was successful but no user was created, it might be a duplicate email
      if (!result.data?.user) {
        return {
          error: new Error('This email is already registered'),
          data: null
        };
      }
      
      // Check if identities array is empty (which indicates the user already exists)
      if (result.data.user.identities?.length === 0) {
        return {
          error: new Error('This email is already registered'),
          data: null
        };
      }
      
      // Return the successful result
      return result;
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      return {
        error: new Error('An unexpected error occurred during signup'),
        data: null
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
