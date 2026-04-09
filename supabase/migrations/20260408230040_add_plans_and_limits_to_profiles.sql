/*
  # Sistema de Planos e Limites

  ## Resumo
  Cria a tabela `profiles` vinculada ao sistema de autenticacao do Supabase e adiciona
  os campos necessarios para controle de planos e limites de uso diario.

  ## Novas Tabelas
  - `profiles`
    - `id` (uuid, PK, FK para auth.users) - identificador do usuario
    - `full_name` (text) - nome completo do usuario
    - `plan_type` (text, default 'free') - tipo do plano: 'free' ou 'pro'
    - `daily_search_count` (int, default 0) - contador de buscas realizadas no dia
    - `last_reset_date` (date, default current_date) - data do ultimo reset do contador
    - `created_at` (timestamptz) - data de criacao
    - `updated_at` (timestamptz) - data de atualizacao

  ## Funcoes e Triggers
  - `reset_daily_search_count()` - funcao que verifica se o dia mudou e reseta o
    contador `daily_search_count` para 0, atualizando `last_reset_date`
  - `trigger_reset_daily_search_count` - trigger BEFORE UPDATE na tabela profiles
    que chama a funcao acima automaticamente antes de qualquer atualizacao

  ## Seguranca
  - RLS habilitado na tabela `profiles`
  - Policy SELECT: usuarios autenticados podem ler apenas o proprio perfil
  - Policy INSERT: usuarios autenticados podem inserir apenas o proprio perfil
  - Policy UPDATE: usuarios autenticados podem atualizar apenas o proprio perfil

  ## Notas
  1. Um trigger em auth.users cria automaticamente um perfil ao registrar novo usuario
  2. O reset do contador e feito via trigger, garantindo consistencia sem depender do cliente
  3. A verificacao de data usa CURRENT_DATE do PostgreSQL (UTC)
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  daily_search_count integer NOT NULL DEFAULT 0,
  last_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION reset_daily_search_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.daily_search_count := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_reset_daily_search_count
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_search_count();

CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();
