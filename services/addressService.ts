import { supabase } from '../lib/supabase';
import { normalizeAddress, areAddressesDuplicates } from './addressNormalizationService';

export interface Address {
  id: string;
  address_text: string;
  normalized_address: string;
  latitude?: number;
  longitude?: number;
  city: string;
  zone: string;
  risk_score: number;
  total_reports: number;
  created_at: string;
  updated_at: string;
}

export const searchAddress = async (query: string): Promise<Address[]> => {
  try {
    const normalizedQuery = normalizeAddress(query).normalized;

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .or(`address_text.ilike.%${query}%,normalized_address.ilike.%${normalizedQuery}%`)
      .order('risk_score', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching addresses:', error);
    throw error;
  }
};

export const getAddressById = async (id: string): Promise<Address | null> => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching address:', error);
    throw error;
  }
};

export const createOrGetAddress = async (addressData: {
  address_text: string;
  normalized_address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  zone?: string;
}): Promise<Address> => {
  try {
    const normalizedResult = normalizeAddress(addressData.address_text);
    const finalNormalizedAddress = addressData.normalized_address || normalizedResult.normalized;

    const { data: duplicateIdResult } = await supabase.rpc('find_duplicate_address', {
      p_normalized_address: finalNormalizedAddress,
      p_latitude: addressData.latitude || null,
      p_longitude: addressData.longitude || null,
      p_text_threshold: 0.85,
      p_gps_threshold: 50,
    });

    if (duplicateIdResult) {
      const { data: existing, error: fetchError } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', duplicateIdResult)
        .single();

      if (fetchError) throw fetchError;

      if (existing.latitude === null && addressData.latitude) {
        await supabase
          .from('addresses')
          .update({
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        existing.latitude = addressData.latitude;
        existing.longitude = addressData.longitude;
      }

      return existing;
    }

    const insertData = {
      address_text: addressData.address_text,
      normalized_address: finalNormalizedAddress,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      city: addressData.city || normalizedResult.city || '',
      zone: addressData.zone || '',
    };

    const { data, error } = await supabase
      .from('addresses')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating/getting address:', error);
    throw error;
  }
};

export const getHighRiskAddresses = async (limit: number = 10): Promise<Address[]> => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .gte('risk_score', 6)
      .order('risk_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching high risk addresses:', error);
    throw error;
  }
};

export const analyzeRoute = async (addresses: string[]): Promise<{
  total: number;
  safe: number;
  warning: number;
  highRisk: number;
  addresses: Address[];
}> => {
  try {
    const addressResults = await Promise.all(
      addresses.map(async (addressText) => {
        const normalizedResult = normalizeAddress(addressText);

        const { data } = await supabase
          .from('addresses')
          .select('*')
          .or(`address_text.ilike.%${addressText}%,normalized_address.ilike.%${normalizedResult.normalized}%`)
          .maybeSingle();

        return data || {
          address_text: addressText,
          risk_score: 0,
          total_reports: 0,
        };
      })
    );

    const safe = addressResults.filter(a => a.risk_score < 3).length;
    const warning = addressResults.filter(a => a.risk_score >= 3 && a.risk_score < 6).length;
    const highRisk = addressResults.filter(a => a.risk_score >= 6).length;

    return {
      total: addresses.length,
      safe,
      warning,
      highRisk,
      addresses: addressResults as Address[],
    };
  } catch (error) {
    console.error('Error analyzing route:', error);
    throw error;
  }
};
