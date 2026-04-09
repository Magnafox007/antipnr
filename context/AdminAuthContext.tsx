import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminLoading: boolean;
  adminSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  adminSignOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const adminSignIn = async (email: string, password: string) => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error || !data.user) {
        return { error: 'not_found' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        return { error: 'not_found' };
      }

      setIsAdminAuthenticated(true);
      return { error: null };
    } finally {
      setAdminLoading(false);
    }
  };

  const adminSignOut = () => {
    setIsAdminAuthenticated(false);
    supabase.auth.signOut();
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated, adminLoading, adminSignIn, adminSignOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
}
