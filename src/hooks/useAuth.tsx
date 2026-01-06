import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  role: 'student' | 'staff';
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, role: 'student' | 'staff') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  };
  const deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  };
  const copySupabaseAuthLocalStorageToCookies = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    keys.forEach((k) => {
      if ((k.startsWith('sb-') && k.endsWith('-auth-token')) || (k.includes('supabase') && k.includes('auth'))) {
        const val = localStorage.getItem(k);
        if (val) setCookie(k, val, 30);
      }
    });
  };
  const importSupabaseAuthFromCookiesToLocalStorage = () => {
    const cookies = document.cookie.split('; ').filter(Boolean);
    cookies.forEach((c) => {
      const eqIdx = c.indexOf('=');
      if (eqIdx > -1) {
        const name = c.slice(0, eqIdx);
        const val = decodeURIComponent(c.slice(eqIdx + 1));
        if ((name.startsWith('sb-') && name.endsWith('-auth-token')) || (name.includes('supabase') && name.includes('auth'))) {
          if (!localStorage.getItem(name)) {
            localStorage.setItem(name, val);
          }
        }
      }
    });
  };
  const clearSupabaseAuthCookies = () => {
    const cookies = document.cookie.split('; ').filter(Boolean);
    cookies.forEach((c) => {
      const eqIdx = c.indexOf('=');
      if (eqIdx > -1) {
        const name = c.slice(0, eqIdx);
        if ((name.startsWith('sb-') && name.endsWith('-auth-token')) || (name.includes('supabase') && name.includes('auth'))) {
          deleteCookie(name);
        }
      }
    });
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  useEffect(() => {
    importSupabaseAuthFromCookiesToLocalStorage();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
        supabase.auth.refreshSession().then(({ data: refreshed }) => {
          if (refreshed.session) {
            setSession(refreshed.session);
          }
        });
<<<<<<< Updated upstream
        fetch(`${window.location.origin}/api/session/refresh`, { credentials: 'include' }).catch(() => {});
=======
>>>>>>> Stashed changes
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, role: 'student' | 'staff') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          role,
          email
        });

      if (profileError) {
        return { error: profileError as unknown as Error };
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
<<<<<<< Updated upstream
    if (rememberMe) {
      try {
        await fetch(`/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, rememberMe: true }),
        });
      } catch {}
    }
=======
>>>>>>> Stashed changes
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (!error) {
      if (!rememberMe) {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keys.push(k);
        }
        keys.forEach((k) => {
          if ((k.startsWith('sb-') && k.endsWith('-auth-token')) || k.includes('supabase') && k.includes('auth')) {
            localStorage.removeItem(k);
          }
        });
        sessionStorage.setItem('session_ephemeral', '1');
        clearSupabaseAuthCookies();
      } else {
        copySupabaseAuthLocalStorageToCookies();
      }
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    keys.forEach((k) => {
      if ((k.startsWith('sb-') && k.endsWith('-auth-token')) || k.includes('supabase') && k.includes('auth')) {
        localStorage.removeItem(k);
      }
    });
    sessionStorage.removeItem('session_ephemeral');
    clearSupabaseAuthCookies();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
