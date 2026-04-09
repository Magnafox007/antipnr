/*
  # Correcao: Incremento Atomico de Buscas

  ## Resumo
  Cria uma funcao RPC que verifica o limite, incrementa o contador e retorna
  o resultado em uma unica operacao atomica, evitando race conditions e o
  problema de bloqueio prematuro causado por multiplas chamadas ao banco.

  ## Nova Funcao
  - `check_and_increment_search(p_user_id uuid)` - verifica se o usuario
    pode realizar uma busca, reseta o contador se o dia mudou, incrementa
    e retorna se foi permitido, o plano e o novo contador.

  ## Notas
  1. Operacao atomica - sem race condition entre leitura e escrita
  2. O reset do dia e feito dentro da mesma transacao
  3. Retorna JSON com: allowed (bool), plan (text), search_count (int)
*/

CREATE OR REPLACE FUNCTION check_and_increment_search(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_allowed boolean;
  v_new_count integer;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', true, 'plan', 'free', 'search_count', 0);
  END IF;

  IF v_profile.last_reset_date < CURRENT_DATE THEN
    v_profile.daily_search_count := 0;
    v_profile.last_reset_date := CURRENT_DATE;
  END IF;

  IF v_profile.plan_type = 'pro' THEN
    v_allowed := true;
  ELSE
    v_allowed := v_profile.daily_search_count < 5;
  END IF;

  IF v_allowed THEN
    v_new_count := v_profile.daily_search_count + 1;
    UPDATE profiles
    SET daily_search_count = v_new_count,
        last_reset_date = v_profile.last_reset_date,
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    v_new_count := v_profile.daily_search_count;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'plan', v_profile.plan_type,
    'search_count', v_new_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_and_increment_search(uuid) TO authenticated;
