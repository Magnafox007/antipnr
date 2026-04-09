import { supabase } from '@/lib/supabase';

export interface AdminUserProfile {
  id: string;
  full_name: string;
  plan_type: 'free' | 'pro';
  role: 'user' | 'admin';
  daily_search_count: number;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPro: number;
  estimatedRevenue: number;
  totalReports: number;
}

export interface RecentSearch {
  id: string;
  address_text: string;
  searched_at: string;
  driver_email?: string;
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'admin';
}

export async function getAdminStats(): Promise<AdminStats> {
  const [profilesRes, reportsRes] = await Promise.all([
    supabase.from('profiles').select('plan_type'),
    supabase.from('reports').select('id', { count: 'exact', head: true }),
  ]);

  const profiles = profilesRes.data ?? [];
  const totalUsers = profiles.length;
  const totalPro = profiles.filter((p) => p.plan_type === 'pro').length;
  const estimatedRevenue = totalPro * 19.9;
  const totalReports = reportsRes.count ?? 0;

  return { totalUsers, totalPro, estimatedRevenue, totalReports };
}

export async function getAdminUsers(filterPro = false): Promise<AdminUserProfile[]> {
  let query = supabase
    .from('profiles')
    .select('id, full_name, plan_type, role, daily_search_count, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filterPro) {
    query = query.eq('plan_type', 'pro');
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as AdminUserProfile[];
}

export async function updateUserPlan(
  userId: string,
  plan: 'free' | 'pro'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ plan_type: plan })
    .eq('id', userId);
  if (error) return { error: 'Erro ao atualizar plano.' };
  return { error: null };
}

export async function getRecentAddressActivity(): Promise<
  { id: string; address_text: string; updated_at: string }[]
> {
  const { data, error } = await supabase
    .from('addresses')
    .select('id, address_text, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data;
}
