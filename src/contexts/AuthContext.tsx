type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
  created_at?: string;
};

function buildUserFromSession(authUser: SupabaseAuthUser): User {
  const meta = authUser.user_metadata || {};
  const role = (meta.role as User['role']) || 'patient';
  return {
    id: authUser.id,
    name: meta.name || authUser.email || 'Guest',
    email: authUser.email || '',
    role,
    createdAt: authUser.created_at ? new Date(authUser.created_at) : new Date(),
  };
}
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: Partial<User> & { password: string }) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const hydrateUserFromSupabase = async (authUser: SupabaseAuthUser) => {
    try {
      await ensureProfile(authUser);
      const profile = await fetchUserProfile(authUser);
      console.log('[Auth] profile hydrated', profile);
      if (profile) {
        setUser(profile);
      }
    } catch (err) {
      console.error('[Auth] hydrateUserFromSupabase error', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      console.log('[Auth] init start');
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log('[Auth] getSession result', session);
        if (session?.user) {
          setUser(prev => prev ?? buildUserFromSession(session.user));
          setToken(session.access_token ?? null);
          hydrateUserFromSupabase(session.user);
        } else {
          console.log('[Auth] no active session on init');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('[Auth] init error', err);
        setUser(null);
        setToken(null);
      } finally {
        console.log('[Auth] init finally, setting loading=false');
        setLoading(false);
      }
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange', event, session);
      try {
        if (session?.user) {
          setUser(buildUserFromSession(session.user));
          setToken(session.access_token ?? null);
          hydrateUserFromSupabase(session.user);
        } else {
          console.log('[Auth] session cleared in onAuthStateChange');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('[Auth] onAuthStateChange error', err);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log('[Auth] cleanup authListener');
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session?.user) return false;
      const profile = await fetchUserProfile(data.session.user);
      if (!profile) return false;
      setUser(profile);
      setToken(data.session.access_token ?? null);
      return true;
    } catch (_err) {
      return false;
    }
  };

  const signup = async (userData: Partial<User> & { password: string }): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email!,
        password: userData.password!,
        options: {
          data: {
            name: userData.name,
            role: (userData.role as User['role']) || 'patient',
            age: (userData as any).age ?? null,
            sex: (userData as any).sex ?? null,
            category: (userData as any).category ?? null,
            bio: (userData as any).bio ?? null,
            experience: (userData as any).experience ?? null,
            location: (userData as any).location ?? null,
            contact_number: (userData as any).contactNumber ?? null,
            agent_experience: (userData as any).agentExperience ?? null,
            preferred_region: (userData as any).preferredRegion ?? null,
          },
        },
      });
      if (error || !data.user) return false;
      const authUser = data.user;
      if (data.session?.user) {
        await ensureProfile(authUser);
        const profile = await fetchUserProfile(authUser);
        if (!profile) return false;
        setUser(profile);
        setToken(data.session.access_token ?? null);
      }
      return true; // account created; if email confirm enabled, login after confirmation
    } catch (_err) {
      return false;
    }
  };

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const role = user.role;
    const table = role === 'doctor' ? 'doctors' : role === 'patient' ? 'patients' : role === 'admin' ? 'admins' : 'agents';
    const payload: any = {};
    Object.entries(updates).forEach(([k, v]) => {
      if (k === 'createdAt' || k === 'role' || k === 'id' || k === 'email') return;
      const snake = k
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase();
      payload[snake] = v;
    });
    if (Object.keys(payload).length > 0) {
      await supabase.from(table).update(payload).eq('id', user.id);
    }
    const refetched = await fetchUserProfile({ id: user.id } as any);
    if (refetched) setUser(refetched);
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

async function fetchUserProfile(authUser: { id: string; email?: string | null }) {
  const id = authUser.id;
  const email = authUser.email || null;
  const tryTable = async (table: string) => {
    const { data } = await supabase.from(table).select('*').eq('id', id).limit(1);
    return data?.[0] || null;
  };
  const doctor = await tryTable('doctors');
  if (doctor) {
    const profile: User = {
      id,
      name: doctor.name,
      email: doctor.email || email || '',
      role: 'doctor',
      createdAt: new Date(doctor.created_at),
      category: doctor.category || '',
      bio: doctor.bio || '',
      experience: doctor.experience || '',
      isApproved: !!doctor.is_approved,
    };
    return profile;
  }
  const patient = await tryTable('patients');
  if (patient) {
    const profile: User = {
      id,
      name: patient.name,
      email: patient.email || email || '',
      role: 'patient',
      createdAt: new Date(patient.created_at),
      age: patient.age ?? undefined,
      sex: patient.sex ?? undefined,
    };
    return profile;
  }
  const admin = await tryTable('admins');
  if (admin) {
    const profile: User = {
      id,
      name: admin.name,
      email: admin.email || email || '',
      role: 'admin',
      createdAt: new Date(admin.created_at),
    };
    return profile;
  }
  const agent = await tryTable('agents');
  if (agent) {
    const profile: User = {
      id,
      name: agent.name,
      email: agent.email || email || '',
      role: 'admin',
      createdAt: new Date(agent.created_at),
    } as any;
    profile.role = 'agent' as any;
    return profile;
  }
  return null;
}

async function ensureProfile(authUser: { id: string; email?: string | null; user_metadata?: any }) {
  const id = authUser.id;
  const meta = authUser.user_metadata || {};
  const name = meta.name || '';
  const email = authUser.email || '';
  const role = (meta.role as User['role']) || 'patient';
  const common: any = { id, name, email, created_at: new Date().toISOString() };
  if (role === 'doctor') {
    const { data } = await supabase.from('doctors').select('id').eq('id', id).limit(1);
    if (!data?.[0]) {
      await supabase.from('doctors').insert({
        ...common,
        category: meta.category || '',
        bio: meta.bio || '',
        experience: meta.experience || '',
        is_approved: false,
      });
    }
  } else if (role === 'patient') {
    const { data } = await supabase.from('patients').select('id').eq('id', id).limit(1);
    if (!data?.[0]) {
      await supabase.from('patients').insert({
        ...common,
        age: meta.age ?? null,
        sex: meta.sex ?? null,
      });
    }
  } else if (role === 'admin') {
    const { data } = await supabase.from('admins').select('id').eq('id', id).limit(1);
    if (!data?.[0]) {
      await supabase.from('admins').insert(common);
    }
  } else if (role === 'agent') {
    const { data } = await supabase.from('agents').select('id').eq('id', id).limit(1);
    if (!data?.[0]) {
      await supabase.from('agents').insert({
        ...common,
        location: meta.location || null,
        contact_number: meta.contact_number || null,
        agent_experience: meta.agent_experience ?? null,
        preferred_region: meta.preferred_region || null,
      });
    }
  }
}