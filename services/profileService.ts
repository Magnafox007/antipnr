import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  plan_type: 'free' | 'pro';
  daily_search_count: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function checkAndIncrementSearch(userId: string): Promise<{
  allowed: boolean;
  plan: 'free' | 'pro';
  searchCount: number;
}> {
  const { data, error } = await supabase.rpc('check_and_increment_search', {
    p_user_id: userId,
  });

  if (error || !data) return { allowed: true, plan: 'free', searchCount: 0 };

  return {
    allowed: data.allowed,
    plan: data.plan as 'free' | 'pro',
    searchCount: data.search_count,
  };
}

export async function checkSearchLimit(userId: string): Promise<{
  allowed: boolean;
  plan: 'free' | 'pro';
  searchCount: number;
}> {
  const profile = await getUserProfile(userId);
  if (!profile) return { allowed: true, plan: 'free', searchCount: 0 };

  if (profile.plan_type === 'pro') {
    return { allowed: true, plan: 'pro', searchCount: profile.daily_search_count };
  }

  const allowed = profile.daily_search_count < 5;
  return { allowed, plan: 'free', searchCount: profile.daily_search_count };
}
