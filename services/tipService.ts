import { supabase } from '../lib/supabase';

export interface Tip {
  id: string;
  address_id: string;
  driver_id: string;
  tip_text: string;
  likes_count: number;
  created_at: string;
}

export interface TipWithAddress extends Tip {
  addresses?: {
    address_text: string;
  };
}

export const createTip = async (tipData: {
  address_id: string;
  tip_text: string;
}): Promise<Tip> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('tips')
      .insert([
        {
          ...tipData,
          driver_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating tip:', error);
    throw error;
  }
};

export const getTipsByAddress = async (addressId: string): Promise<TipWithAddress[]> => {
  try {
    const { data, error } = await supabase
      .from('tips')
      .select('*, addresses(address_text)')
      .eq('address_id', addressId)
      .order('likes_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tips:', error);
    throw error;
  }
};

export const getRecentTips = async (limit: number = 20): Promise<TipWithAddress[]> => {
  try {
    const { data, error } = await supabase
      .from('tips')
      .select('*, addresses(address_text)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent tips:', error);
    throw error;
  }
};

export const deleteTip = async (tipId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tips')
      .delete()
      .eq('id', tipId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting tip:', error);
    throw error;
  }
};

export const likeTip = async (tipId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('tip_likes')
      .insert([
        {
          tip_id: tipId,
          driver_id: user.id,
        },
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Error liking tip:', error);
    throw error;
  }
};

export const unlikeTip = async (tipId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('tip_likes')
      .delete()
      .eq('tip_id', tipId)
      .eq('driver_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error unliking tip:', error);
    throw error;
  }
};

export const hasUserLikedTip = async (tipId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('tip_likes')
      .select('id')
      .eq('tip_id', tipId)
      .eq('driver_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return !!data;
  } catch (error) {
    console.error('Error checking tip like:', error);
    return false;
  }
};
