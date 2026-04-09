/*
  # AntiPNR Database Schema

  1. New Tables
    
    ## addresses
    - `id` (uuid, primary key) - Unique address identifier
    - `address_text` (text) - Full address as text
    - `normalized_address` (text) - Standardized address format
    - `latitude` (numeric) - GPS latitude coordinate
    - `longitude` (numeric) - GPS longitude coordinate
    - `city` (text) - City name
    - `zone` (text) - Geographic zone/neighborhood
    - `risk_score` (numeric) - Calculated risk score (0-10)
    - `total_reports` (integer) - Total number of reports
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
    
    ## reports
    - `id` (uuid, primary key) - Unique report identifier
    - `address_id` (uuid, foreign key) - Reference to addresses table
    - `driver_id` (uuid, foreign key) - Reference to auth.users
    - `issue_type` (text) - Type of issue (PNR, Difficult Location, Customer Dispute, Other)
    - `note` (text) - Optional detailed note
    - `confirmations_count` (integer) - Number of confirmations
    - `is_verified` (boolean) - Whether report is verified by multiple drivers
    - `created_at` (timestamptz) - Report creation timestamp
    
    ## confirmations
    - `id` (uuid, primary key) - Unique confirmation identifier
    - `report_id` (uuid, foreign key) - Reference to reports table
    - `driver_id` (uuid, foreign key) - Reference to auth.users
    - `confirmation_type` (text) - Type: 'confirm' or 'deny'
    - `created_at` (timestamptz) - Confirmation timestamp
    
    ## tips
    - `id` (uuid, primary key) - Unique tip identifier
    - `address_id` (uuid, foreign key) - Reference to addresses table
    - `driver_id` (uuid, foreign key) - Reference to auth.users
    - `tip_text` (text) - The helpful tip content
    - `likes_count` (integer) - Number of likes
    - `created_at` (timestamptz) - Tip creation timestamp
    
    ## tip_likes
    - `id` (uuid, primary key) - Unique like identifier
    - `tip_id` (uuid, foreign key) - Reference to tips table
    - `driver_id` (uuid, foreign key) - Reference to auth.users
    - `created_at` (timestamptz) - Like timestamp

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to read all data
    - Policies for authenticated users to create their own reports/tips
    - Policies for authenticated users to update their own content
    - Policies for authenticated users to delete their own content

  3. Indexes
    - Index on address_id for fast lookups
    - Index on driver_id for user-specific queries
    - Index on risk_score for sorting
    - Index on coordinates for spatial queries
*/

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_text text NOT NULL,
  normalized_address text NOT NULL,
  latitude numeric,
  longitude numeric,
  city text DEFAULT '',
  zone text DEFAULT '',
  risk_score numeric DEFAULT 0,
  total_reports integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id uuid NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type text NOT NULL CHECK (issue_type IN ('PNR', 'Difficult Location', 'Customer Dispute', 'Other')),
  note text DEFAULT '',
  confirmations_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create confirmations table
CREATE TABLE IF NOT EXISTS confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmation_type text NOT NULL CHECK (confirmation_type IN ('confirm', 'deny')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(report_id, driver_id)
);

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id uuid NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_text text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create tip_likes table
CREATE TABLE IF NOT EXISTS tip_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id uuid NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tip_id, driver_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_address_id ON reports(address_id);
CREATE INDEX IF NOT EXISTS idx_reports_driver_id ON reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confirmations_report_id ON confirmations(report_id);
CREATE INDEX IF NOT EXISTS idx_tips_address_id ON tips(address_id);
CREATE INDEX IF NOT EXISTS idx_tips_driver_id ON tips(driver_id);
CREATE INDEX IF NOT EXISTS idx_addresses_risk_score ON addresses(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_addresses_coordinates ON addresses(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addresses table
CREATE POLICY "Anyone can view addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert addresses"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for reports table
CREATE POLICY "Anyone can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete own reports"
  ON reports FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- RLS Policies for confirmations table
CREATE POLICY "Anyone can view confirmations"
  ON confirmations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can create confirmations"
  ON confirmations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete own confirmations"
  ON confirmations FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- RLS Policies for tips table
CREATE POLICY "Anyone can view tips"
  ON tips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can create tips"
  ON tips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own tips"
  ON tips FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete own tips"
  ON tips FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- RLS Policies for tip_likes table
CREATE POLICY "Anyone can view tip likes"
  ON tip_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can like tips"
  ON tip_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can unlike tips"
  ON tip_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- Create function to update address risk score
CREATE OR REPLACE FUNCTION update_address_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE addresses
  SET 
    total_reports = (
      SELECT COUNT(*) 
      FROM reports 
      WHERE address_id = NEW.address_id
    ),
    risk_score = LEAST(10, (
      SELECT COUNT(*) * 1.5 + 
        COALESCE(SUM(CASE WHEN is_verified THEN 2 ELSE 0 END), 0)
      FROM reports 
      WHERE address_id = NEW.address_id
    )),
    updated_at = now()
  WHERE id = NEW.address_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating risk score on new reports
CREATE TRIGGER update_risk_on_report
  AFTER INSERT OR UPDATE OR DELETE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_address_risk_score();

-- Create function to update confirmation count
CREATE OR REPLACE FUNCTION update_confirmation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reports
    SET 
      confirmations_count = confirmations_count + CASE WHEN NEW.confirmation_type = 'confirm' THEN 1 ELSE 0 END,
      is_verified = CASE WHEN confirmations_count + 1 >= 3 THEN true ELSE is_verified END
    WHERE id = NEW.report_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reports
    SET confirmations_count = GREATEST(0, confirmations_count - 1)
    WHERE id = OLD.report_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating confirmation count
CREATE TRIGGER update_confirmation_trigger
  AFTER INSERT OR DELETE ON confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_confirmation_count();

-- Create function to update tip likes count
CREATE OR REPLACE FUNCTION update_tip_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tips
    SET likes_count = likes_count + 1
    WHERE id = NEW.tip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tips
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.tip_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating tip likes count
CREATE TRIGGER update_tip_likes_trigger
  AFTER INSERT OR DELETE ON tip_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_tip_likes_count();
