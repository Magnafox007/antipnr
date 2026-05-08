/*
  # Create users, subscriptions, payments, and admin_logs tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `nome` (text, user display name)
      - `role` (text, default 'user')
      - `banned` (boolean, default false)
      - `subscription_status` (text, default 'free')
      - `created_at` (timestamp, default now)
      - `last_login` (timestamp)
      - `device_id` (text)
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `plano` (text, default 'premium')
      - `valor` (numeric, default 20.00)
      - `status` (text, default 'ativa')
      - `data_inicio` (timestamp, default now)
      - `data_fim` (timestamp)
      - `dias_restantes` (integer)
      - `renovacao` (text, default 'mensal')
      - `gateway` (text)
      - `created_at` (timestamp, default now)
    - `payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `valor` (numeric)
      - `status` (text)
      - `transaction_id` (text)
      - `gateway` (text)
      - `created_at` (timestamp, default now)
    - `admin_logs`
      - `id` (uuid, primary key)
      - `admin_id` (uuid)
      - `action` (text)
      - `ip` (text)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on all tables
    - Users can read/update their own row in `users`
    - Users can read their own subscriptions and payments
    - Only admins (role = 'admin') can read admin_logs
    - Insert policies restricted to authenticated users for their own data

  3. Indexes
    - Index on subscriptions.user_id
    - Index on payments.user_id
    - Index on admin_logs.admin_id
*/

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  role TEXT DEFAULT 'user',
  banned BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  device_id TEXT
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own row"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own row"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  plano TEXT DEFAULT 'premium',
  valor NUMERIC(10,2) DEFAULT 20.00,
  status TEXT DEFAULT 'ativa',
  data_inicio TIMESTAMP DEFAULT NOW(),
  data_fim TIMESTAMP,
  dias_restantes INTEGER,
  renovacao TEXT DEFAULT 'mensal',
  gateway TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  valor NUMERIC(10,2),
  status TEXT,
  transaction_id TEXT,
  gateway TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- ADMIN LOGS
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action TEXT,
  ip TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin logs"
  ON admin_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert admin logs"
  ON admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
