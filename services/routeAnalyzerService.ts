import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { normalizeAddress } from './addressNormalizationService';

export interface RouteAddress {
  originalAddress: string;
  street?: string;
  number?: string;
  city?: string;
  normalizedAddress: string;
}

export interface RouteAddressWithRisk extends RouteAddress {
  matchedAddressId?: string;
  riskScore: number;
  reportCount: number;
  riskLevel: 'safe' | 'attention' | 'moderate' | 'high';
  riskColor: string;
  hasMatch: boolean;
}

export interface RouteAnalysisResult {
  totalAddresses: number;
  safeAddresses: number;
  attentionAddresses: number;
  moderateRiskAddresses: number;
  highRiskAddresses: number;
  addresses: RouteAddressWithRisk[];
  processedAt: Date;
}

const normalizeAddressSimple = (address: string): string => {
  const result = normalizeAddress(address);
  return result.normalized;
};

const buildFullAddress = (row: any): RouteAddress => {
  let fullAddress = '';
  let street = '';
  let number = '';
  let city = '';

  const addressField = row.Address || row.address || row.Endereco || row.endereco || row.ENDERECO || '';
  const streetField = row.Street || row.street || row.Rua || row.rua || row.RUA || '';
  const numberField = row.Number || row.number || row.Numero || row.numero || row.NUMERO || '';
  const cityField = row.City || row.city || row.Cidade || row.cidade || row.CIDADE || '';

  if (addressField) {
    fullAddress = addressField;
    street = addressField;
  } else if (streetField) {
    street = streetField;
    number = numberField;
    fullAddress = `${streetField}${numberField ? ' ' + numberField : ''}`;
  }

  if (cityField) {
    city = cityField;
    fullAddress = `${fullAddress}, ${cityField}`;
  }

  return {
    originalAddress: fullAddress.trim(),
    street: street || undefined,
    number: number || undefined,
    city: city || undefined,
    normalizedAddress: normalizeAddressSimple(fullAddress),
  };
};

const getRiskLevel = (riskScore: number): {
  level: 'safe' | 'attention' | 'moderate' | 'high';
  color: string;
} => {
  if (riskScore >= 9) {
    return { level: 'high', color: '#EF4444' };
  } else if (riskScore >= 6) {
    return { level: 'moderate', color: '#F97316' };
  } else if (riskScore >= 3) {
    return { level: 'attention', color: '#EAB308' };
  } else {
    return { level: 'safe', color: '#22C55E' };
  }
};

export const parseExcelFile = async (fileUri: string): Promise<RouteAddress[]> => {
  try {
    const response = await fetch(fileUri);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const addresses: RouteAddress[] = jsonData.map((row: any) => buildFullAddress(row));

    return addresses.filter(addr => addr.originalAddress.length > 0);
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Falha ao ler arquivo Excel');
  }
};

export const parseCSVFile = async (fileUri: string): Promise<RouteAddress[]> => {
  try {
    const response = await fetch(fileUri);
    const text = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const addresses: RouteAddress[] = results.data.map((row: any) => buildFullAddress(row));
          resolve(addresses.filter(addr => addr.originalAddress.length > 0));
        },
        error: (error: Error) => {
          reject(new Error('Falha ao ler arquivo CSV: ' + error.message));
        },
      });
    });
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    throw new Error('Falha ao ler arquivo CSV');
  }
};

export const analyzeRouteAddresses = async (
  addresses: RouteAddress[]
): Promise<RouteAnalysisResult> => {
  try {
    const addressesWithRisk: RouteAddressWithRisk[] = [];

    for (const address of addresses) {
      const { data: matchedAddresses, error } = await supabase
        .from('addresses')
        .select('id, address_text, risk_score, total_reports, normalized_address')
        .ilike('normalized_address', `%${address.normalizedAddress}%`)
        .limit(1);

      if (error) {
        console.error('Error searching address:', error);
      }

      let riskScore = 0;
      let reportCount = 0;
      let matchedAddressId: string | undefined;
      let hasMatch = false;

      if (matchedAddresses && matchedAddresses.length > 0) {
        const match = matchedAddresses[0];
        riskScore = Number(match.risk_score) || 0;
        reportCount = match.total_reports || 0;
        matchedAddressId = match.id;
        hasMatch = true;
      }

      const { level, color } = getRiskLevel(riskScore);

      addressesWithRisk.push({
        ...address,
        matchedAddressId,
        riskScore,
        reportCount,
        riskLevel: level,
        riskColor: color,
        hasMatch,
      });
    }

    const safeCount = addressesWithRisk.filter(a => a.riskLevel === 'safe').length;
    const attentionCount = addressesWithRisk.filter(a => a.riskLevel === 'attention').length;
    const moderateCount = addressesWithRisk.filter(a => a.riskLevel === 'moderate').length;
    const highCount = addressesWithRisk.filter(a => a.riskLevel === 'high').length;

    return {
      totalAddresses: addressesWithRisk.length,
      safeAddresses: safeCount,
      attentionAddresses: attentionCount,
      moderateRiskAddresses: moderateCount,
      highRiskAddresses: highCount,
      addresses: addressesWithRisk,
      processedAt: new Date(),
    };
  } catch (error) {
    console.error('Error analyzing route:', error);
    throw error;
  }
};

export const analyzeRouteFile = async (
  fileUri: string,
  fileType: 'xlsx' | 'csv'
): Promise<RouteAnalysisResult> => {
  let addresses: RouteAddress[];

  if (fileType === 'xlsx') {
    addresses = await parseExcelFile(fileUri);
  } else {
    addresses = await parseCSVFile(fileUri);
  }

  if (addresses.length === 0) {
    throw new Error('Nenhum endereço encontrado no arquivo');
  }

  return await analyzeRouteAddresses(addresses);
};

export const parseTextAddresses = (text: string): RouteAddress[] => {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const addresses: RouteAddress[] = lines.map(line => {
    const normalizedAddress = normalizeAddressSimple(line);

    return {
      originalAddress: line,
      normalizedAddress,
    };
  });

  return addresses;
};

export const analyzeTextRoute = async (text: string): Promise<RouteAnalysisResult> => {
  const addresses = parseTextAddresses(text);

  if (addresses.length === 0) {
    throw new Error('Nenhum endereço encontrado no texto');
  }

  return await analyzeRouteAddresses(addresses);
};

export const openInGoogleMaps = (address: string): void => {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
};
