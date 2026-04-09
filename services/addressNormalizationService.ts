const ABBREVIATION_MAP: Record<string, string> = {
  rua: 'r',
  avenida: 'av',
  avenidas: 'av',
  alameda: 'al',
  travessa: 'tv',
  praca: 'pc',
  largo: 'lg',
  rodovia: 'rod',
  estrada: 'estr',
  viela: 'vl',
  vila: 'vl',
  condominio: 'cond',
  conjunto: 'conj',
  quadra: 'q',
  lote: 'lt',
  bloco: 'bl',
  apartamento: 'apt',
  numero: 'n',
  km: 'km',
  oeste: 'o',
  leste: 'l',
  norte: 'n',
  sul: 's',
  sao: 'sao',
  santo: 'sto',
  santa: 'sta',
};

const SPECIAL_CHARS_PATTERN = /[^\w\s]/g;
const MULTIPLE_SPACES_PATTERN = /\s+/g;
const NUMBER_PREFIX_PATTERN = /\b(n|num|numero|nro|nr)\s*\.?\s*(\d+)/gi;
const STREET_PREFIX_PATTERN = /^(rua|r|avenida|av|alameda|al|travessa|tv|praca|pc|largo|lg|rodovia|rod|estrada|estr)\s+\.?\s*/i;

export interface NormalizedAddressResult {
  original: string;
  normalized: string;
  displayFormat: string;
  streetName?: string;
  streetNumber?: string;
  city?: string;
  state?: string;
}

export const normalizeAddress = (address: string): NormalizedAddressResult => {
  if (!address || typeof address !== 'string') {
    return {
      original: '',
      normalized: '',
      displayFormat: '',
    };
  }

  const original = address.trim();
  let normalized = original.toLowerCase();

  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  normalized = normalized.replace(NUMBER_PREFIX_PATTERN, '$2');

  normalized = normalized.replace(SPECIAL_CHARS_PATTERN, ' ');

  normalized = normalized.replace(MULTIPLE_SPACES_PATTERN, ' ');

  const words = normalized.split(' ');
  const normalizedWords = words.map(word => {
    const trimmedWord = word.trim();
    return ABBREVIATION_MAP[trimmedWord] || trimmedWord;
  });

  normalized = normalizedWords.join(' ').trim();

  const displayFormat = formatAddressForDisplay(original);

  const streetNumber = extractStreetNumber(original);
  const streetName = extractStreetName(original, streetNumber);
  const city = extractCity(original);

  return {
    original,
    normalized,
    displayFormat,
    streetName,
    streetNumber,
    city,
  };
};

const extractStreetNumber = (address: string): string | undefined => {
  const numberMatch = address.match(/\b(\d+[a-zA-Z]?)\b/);
  return numberMatch ? numberMatch[1] : undefined;
};

const extractStreetName = (address: string, streetNumber?: string): string | undefined => {
  let streetName = address;

  const prefixMatch = address.match(STREET_PREFIX_PATTERN);
  if (prefixMatch) {
    streetName = address.substring(prefixMatch[0].length);
  }

  if (streetNumber) {
    const numberIndex = streetName.indexOf(streetNumber);
    if (numberIndex > 0) {
      streetName = streetName.substring(0, numberIndex).trim();
    }
  }

  const commaIndex = streetName.indexOf(',');
  if (commaIndex > 0) {
    streetName = streetName.substring(0, commaIndex).trim();
  }

  return streetName.trim() || undefined;
};

const extractCity = (address: string): string | undefined => {
  const parts = address.split(',');
  if (parts.length > 1) {
    const cityPart = parts[parts.length - 1].trim();
    const cityMatch = cityPart.match(/([a-zA-ZÀ-ÿ\s]+)/);
    return cityMatch ? cityMatch[1].trim() : undefined;
  }
  return undefined;
};

const formatAddressForDisplay = (address: string): string => {
  let formatted = address.trim();

  formatted = formatted.replace(/\s+/g, ' ');

  formatted = formatted.replace(/\s*,\s*/g, ', ');

  formatted = formatted.replace(/\s*\.\s*/g, '. ');

  formatted = formatted.replace(/\bn\s*\.?\s*(\d+)/gi, 'Nº $1');
  formatted = formatted.replace(/\bnum\s*\.?\s*(\d+)/gi, 'Nº $1');
  formatted = formatted.replace(/\bnumero\s*\.?\s*(\d+)/gi, 'Nº $1');

  const words = formatted.split(' ');
  const capitalizedWords = words.map((word, index) => {
    const lower = word.toLowerCase();

    if (index === 0 || !['de', 'da', 'do', 'dos', 'das', 'e'].includes(lower)) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return lower;
  });

  return capitalizedWords.join(' ');
};

export const calculateAddressSimilarity = (addr1: string, addr2: string): number => {
  const normalized1 = normalizeAddress(addr1).normalized;
  const normalized2 = normalizeAddress(addr2).normalized;

  if (normalized1 === normalized2) {
    return 1.0;
  }

  const words1 = normalized1.split(' ').filter(w => w.length > 0);
  const words2 = normalized2.split(' ').filter(w => w.length > 0);

  const commonWords = words1.filter(word => words2.includes(word));
  const totalUniqueWords = new Set([...words1, ...words2]).size;

  if (totalUniqueWords === 0) return 0;

  return commonWords.length / totalUniqueWords;
};

export const calculateGPSDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance * 1000;
};

const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

export const areAddressesDuplicates = (
  address1: {
    normalized: string;
    latitude?: number;
    longitude?: number;
  },
  address2: {
    normalized: string;
    latitude?: number;
    longitude?: number;
  },
  options: {
    textSimilarityThreshold?: number;
    gpsDistanceThreshold?: number;
  } = {}
): boolean => {
  const textThreshold = options.textSimilarityThreshold || 0.85;
  const gpsThreshold = options.gpsDistanceThreshold || 50;

  const textSimilarity = calculateAddressSimilarity(
    address1.normalized,
    address2.normalized
  );

  if (textSimilarity >= textThreshold) {
    return true;
  }

  if (
    address1.latitude &&
    address1.longitude &&
    address2.latitude &&
    address2.longitude
  ) {
    const distance = calculateGPSDistance(
      address1.latitude,
      address1.longitude,
      address2.latitude,
      address2.longitude
    );

    if (distance <= gpsThreshold) {
      return true;
    }
  }

  return false;
};

export const testNormalization = () => {
  const testCases = [
    'Rua Silva, 120',
    'R Silva 120',
    'Rua Silva Nº120',
    'rua silva n 120',
    'RUA SILVA NUMERO 120',
    'Rua Silva, nº 120, São Paulo',
    'Av. Paulista, 1000',
    'Avenida Paulista 1000',
    'av paulista n 1000',
  ];

  console.log('Address Normalization Test Results:');
  console.log('=====================================\n');

  testCases.forEach(address => {
    const result = normalizeAddress(address);
    console.log(`Original: "${address}"`);
    console.log(`Normalized: "${result.normalized}"`);
    console.log(`Display: "${result.displayFormat}"`);
    console.log('---');
  });
};
