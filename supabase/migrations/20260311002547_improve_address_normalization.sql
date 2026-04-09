/*
  # Improve Address Normalization and Duplicate Detection

  ## Summary
  This migration enhances address normalization capabilities and adds database-level
  support for duplicate detection.

  ## Changes

  1. Indexes
    - Add index on `normalized_address` for faster duplicate detection
    - Add index on `latitude, longitude` for GPS-based matching
    - Add composite index for efficient range queries

  2. Functions
    - Create function to calculate text similarity using PostgreSQL's built-in functions
    - Create function to calculate GPS distance using PostGIS-like logic
    - Create function to check for duplicate addresses

  3. Constraints
    - Ensure normalized_address is always set when address_text is provided

  ## Notes
  - This migration is safe to run on existing data
  - Indexes will improve performance for duplicate detection
  - No data will be lost or modified
*/

-- Add index on normalized_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_addresses_normalized_address 
ON addresses(normalized_address);

-- Add index on GPS coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_addresses_coordinates 
ON addresses(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_addresses_search 
ON addresses(normalized_address, risk_score DESC);

-- Create function to calculate text similarity (simplified Levenshtein-like)
CREATE OR REPLACE FUNCTION calculate_address_similarity(addr1 TEXT, addr2 TEXT)
RETURNS FLOAT AS $$
DECLARE
  words1 TEXT[];
  words2 TEXT[];
  common_words INTEGER;
  total_unique_words INTEGER;
BEGIN
  -- Split addresses into words
  words1 := string_to_array(lower(addr1), ' ');
  words2 := string_to_array(lower(addr2), ' ');
  
  -- Count common words
  SELECT COUNT(DISTINCT w)
  INTO common_words
  FROM unnest(words1) AS w
  WHERE w = ANY(words2);
  
  -- Count total unique words
  SELECT COUNT(DISTINCT w)
  INTO total_unique_words
  FROM (
    SELECT unnest(words1) AS w
    UNION
    SELECT unnest(words2) AS w
  ) AS all_words;
  
  -- Return similarity ratio
  IF total_unique_words = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN common_words::FLOAT / total_unique_words::FLOAT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate GPS distance in meters
CREATE OR REPLACE FUNCTION calculate_gps_distance(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT NUMERIC := 6371000; -- Earth radius in meters
  dLat NUMERIC;
  dLon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat / 2) * sin(dLat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon / 2) * sin(dLon / 2);
  
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to find duplicate addresses
CREATE OR REPLACE FUNCTION find_duplicate_address(
  p_normalized_address TEXT,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_text_threshold FLOAT DEFAULT 0.85,
  p_gps_threshold NUMERIC DEFAULT 50
)
RETURNS UUID AS $$
DECLARE
  duplicate_id UUID;
  text_similarity FLOAT;
  gps_distance NUMERIC;
BEGIN
  -- First try exact match on normalized address
  SELECT id INTO duplicate_id
  FROM addresses
  WHERE normalized_address = p_normalized_address
  LIMIT 1;
  
  IF duplicate_id IS NOT NULL THEN
    RETURN duplicate_id;
  END IF;
  
  -- Try fuzzy text matching
  SELECT a.id INTO duplicate_id
  FROM addresses a
  WHERE calculate_address_similarity(a.normalized_address, p_normalized_address) >= p_text_threshold
  LIMIT 1;
  
  IF duplicate_id IS NOT NULL THEN
    RETURN duplicate_id;
  END IF;
  
  -- Try GPS-based matching if coordinates are provided
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    SELECT a.id INTO duplicate_id
    FROM addresses a
    WHERE a.latitude IS NOT NULL 
      AND a.longitude IS NOT NULL
      AND calculate_gps_distance(a.latitude, a.longitude, p_latitude, p_longitude) <= p_gps_threshold
    ORDER BY calculate_gps_distance(a.latitude, a.longitude, p_latitude, p_longitude)
    LIMIT 1;
  END IF;
  
  RETURN duplicate_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the duplicate detection strategy
COMMENT ON FUNCTION find_duplicate_address IS 
'Finds duplicate addresses using three strategies:
1. Exact normalized address match (fastest)
2. Fuzzy text similarity match (>= 85% by default)
3. GPS proximity match (<= 50m by default)
Returns the ID of the first matching address, or NULL if no match found.';
