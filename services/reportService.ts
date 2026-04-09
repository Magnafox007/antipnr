import { supabase } from '../lib/supabase';

export interface Report {
  id: string;
  address_id: string;
  driver_id: string;
  issue_type: 'PNR' | 'Difficult Location' | 'Customer Dispute' | 'Other';
  note: string;
  confirmations_count: number;
  is_verified: boolean;
  created_at: string;
}

export interface ReportWithAddress extends Report {
  addresses?: {
    address_text: string;
    risk_score: number;
  };
}

export const createReport = async (reportData: {
  address_id: string;
  issue_type: 'PNR' | 'Difficult Location' | 'Customer Dispute' | 'Other';
  note?: string;
}): Promise<Report> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          ...reportData,
          driver_id: user.id,
          note: reportData.note || '',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
};

export const getReportsByAddress = async (addressId: string): Promise<ReportWithAddress[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, addresses(address_text, risk_score)')
      .eq('address_id', addressId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
};

export const getRecentReports = async (limit: number = 20): Promise<ReportWithAddress[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, addresses(address_text, risk_score)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    throw error;
  }
};

export const deleteReport = async (reportId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};

export const getReportStats = async (): Promise<{
  total: number;
  pnr: number;
  difficultLocation: number;
  customerDispute: number;
  other: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('issue_type');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pnr: data?.filter(r => r.issue_type === 'PNR').length || 0,
      difficultLocation: data?.filter(r => r.issue_type === 'Difficult Location').length || 0,
      customerDispute: data?.filter(r => r.issue_type === 'Customer Dispute').length || 0,
      other: data?.filter(r => r.issue_type === 'Other').length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching report stats:', error);
    throw error;
  }
};
