import { supabase } from '@/lib/supabase';

export interface Address {
  id: string;
  address_text: string;
  normalized_address: string;
  city: string;
  zone: string;
  risk_score: number;
  total_reports: number;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  address_id: string;
  driver_id: string;
  issue_type: string;
  note: string;
  confirmations_count: number;
  is_verified: boolean;
  created_at: string;
  addresses?: Address;
}

export interface Tip {
  id: string;
  address_id: string;
  driver_id: string;
  tip_text: string;
  likes_count: number;
  created_at: string;
  addresses?: Address;
}

export interface CommunityStats {
  totalAddresses: number;
  totalReports: number;
  issueCounts: { PNR: number; 'Difficult Location': number; 'Customer Dispute': number; Other: number };
}

export interface ZoneStats {
  zone: string;
  reports: number;
  addresses: number;
  riskLevel: 'low' | 'medium' | 'high';
  color: string;
}

export async function searchAddresses(query: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .ilike('address_text', `%${query}%`)
    .order('risk_score', { ascending: false })
    .limit(10);
  if (error) return [];
  return data || [];
}

export async function getTopRiskAddresses(limit = 5): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .gt('total_reports', 0)
    .order('risk_score', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function getRecentReports(limit = 10): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, addresses(address_text, zone)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function getRecentTips(limit = 5): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select('*, addresses(address_text)')
    .order('likes_count', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const [addressRes, reportRes, issueRes] = await Promise.all([
    supabase.from('addresses').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('issue_type'),
  ]);

  const issueCounts = { PNR: 0, 'Difficult Location': 0, 'Customer Dispute': 0, Other: 0 };
  (issueRes.data || []).forEach((r: { issue_type: string }) => {
    const key = r.issue_type as keyof typeof issueCounts;
    if (key in issueCounts) issueCounts[key]++;
  });

  return {
    totalAddresses: addressRes.count || 0,
    totalReports: reportRes.count || 0,
    issueCounts,
  };
}

export async function getZoneStats(): Promise<ZoneStats[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('zone, risk_score, total_reports')
    .not('zone', 'eq', '');

  if (error || !data) return [];

  const zoneMap: Record<string, { reports: number; addresses: number; totalRisk: number }> = {};
  data.forEach((a) => {
    const z = a.zone || 'Sem zona';
    if (!zoneMap[z]) zoneMap[z] = { reports: 0, addresses: 0, totalRisk: 0 };
    zoneMap[z].addresses++;
    zoneMap[z].reports += a.total_reports || 0;
    zoneMap[z].totalRisk += a.risk_score || 0;
  });

  return Object.entries(zoneMap)
    .map(([zone, stats]) => {
      const avgRisk = stats.addresses > 0 ? stats.totalRisk / stats.addresses : 0;
      const riskLevel: 'low' | 'medium' | 'high' =
        avgRisk >= 6 ? 'high' : avgRisk >= 3 ? 'medium' : 'low';
      const color = riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#10b981';
      return { zone, reports: stats.reports, addresses: stats.addresses, riskLevel, color };
    })
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 6);
}

export async function getAddressTips(addressId: string): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('address_id', addressId)
    .order('likes_count', { ascending: false })
    .limit(5);
  if (error) return [];
  return data || [];
}

export async function submitReport(
  addressText: string,
  issueType: string,
  note: string,
  userId: string
): Promise<{ error: string | null }> {
  let addressId: string;

  const { data: existing } = await supabase
    .from('addresses')
    .select('id')
    .ilike('address_text', `%${addressText.trim()}%`)
    .maybeSingle();

  if (existing) {
    addressId = existing.id;
  } else {
    const { data: newAddr, error: addrErr } = await supabase
      .from('addresses')
      .insert({
        address_text: addressText.trim(),
        normalized_address: addressText.trim().toLowerCase(),
      })
      .select('id')
      .single();
    if (addrErr || !newAddr) return { error: 'Erro ao registrar endereço.' };
    addressId = newAddr.id;
  }

  const { error } = await supabase.from('reports').insert({
    address_id: addressId,
    driver_id: userId,
    issue_type: issueType,
    note: note.trim(),
  });

  if (error) return { error: 'Erro ao enviar relato.' };
  return { error: null };
}

export async function confirmReport(
  reportId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('confirmations').insert({
    report_id: reportId,
    driver_id: userId,
    confirmation_type: 'confirm',
  });
  if (error) return { error: 'Ja confirmado ou erro ao confirmar.' };
  return { error: null };
}

export async function hasConfirmedReport(reportId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('confirmations')
    .select('id')
    .eq('report_id', reportId)
    .eq('driver_id', userId)
    .maybeSingle();
  return !!data;
}

export async function likeTip(tipId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tip_likes').insert({
    tip_id: tipId,
    driver_id: userId,
  });
  if (error) return { error: 'Ja curtido ou erro ao curtir.' };
  return { error: null };
}

export async function unlikeTip(tipId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tip_likes')
    .delete()
    .eq('tip_id', tipId)
    .eq('driver_id', userId);
  if (error) return { error: 'Erro ao remover curtida.' };
  return { error: null };
}

export async function getLikedTipIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('tip_likes')
    .select('tip_id')
    .eq('driver_id', userId);
  return new Set((data || []).map((r: { tip_id: string }) => r.tip_id));
}

export async function getConfirmedReportIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('confirmations')
    .select('report_id')
    .eq('driver_id', userId);
  return new Set((data || []).map((r: { report_id: string }) => r.report_id));
}

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)} min atras`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atras`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} dias atras`;
  return date.toLocaleDateString('pt-BR');
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export function getRiskColor(level: 'low' | 'medium' | 'high' | string): string {
  if (level === 'high') return '#ef4444';
  if (level === 'medium') return '#f59e0b';
  return '#10b981';
}

export function getIssueTypeColor(type: string): string {
  switch (type) {
    case 'PNR': return '#ef4444';
    case 'Difficult Location': return '#f59e0b';
    case 'Customer Dispute': return '#8b5cf6';
    default: return '#6b7280';
  }
}

export function getIssueTypeLabel(type: string): string {
  switch (type) {
    case 'PNR': return 'PNR';
    case 'Difficult Location': return 'Local Dificil';
    case 'Customer Dispute': return 'Disputa Cliente';
    default: return 'Outro';
  }
}
