import { supabase } from '../lib/supabase';

export interface Confirmation {
  id: string;
  report_id: string;
  driver_id: string;
  confirmation_type: 'confirm' | 'deny';
  created_at: string;
}

export const createConfirmation = async (
  reportId: string,
  confirmationType: 'confirm' | 'deny'
): Promise<Confirmation> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('confirmations')
      .insert([
        {
          report_id: reportId,
          driver_id: user.id,
          confirmation_type: confirmationType,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating confirmation:', error);
    throw error;
  }
};

export const getConfirmationsByReport = async (reportId: string): Promise<Confirmation[]> => {
  try {
    const { data, error } = await supabase
      .from('confirmations')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching confirmations:', error);
    throw error;
  }
};

export const deleteConfirmation = async (confirmationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('confirmations')
      .delete()
      .eq('id', confirmationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting confirmation:', error);
    throw error;
  }
};

export const hasUserConfirmed = async (reportId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('confirmations')
      .select('id')
      .eq('report_id', reportId)
      .eq('driver_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return !!data;
  } catch (error) {
    console.error('Error checking confirmation:', error);
    return false;
  }
};
