import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ShieldAlert, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type UserRole = 'master_admin' | 'admin' | 'premium' | 'user';

function getErrorMessage(errorMsg: string): string {
  if (errorMsg.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (errorMsg.includes('Email not confirmed')) {
    return 'E-mail ainda nao confirmado.';
  }
  if (errorMsg.includes('Too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos.';
  }
  return 'Erro ao fazer login. Tente novamente.';
}

function resolveRedirect(role: UserRole): string {
  if (role === 'master_admin' || role === 'admin') {
    return '/admin-secret';
  }
  return '/(tabs)';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Preencha todos os campos.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (authError || !data.user) {
        setError(getErrorMessage(authError?.message ?? 'Unknown error'));
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, plan_type')
        .eq('id', data.user.id)
        .maybeSingle();

      const role: UserRole = profile?.role ?? 'user';
      const destination = resolveRedirect(role);

      router.replace(destination as any);
    } catch {
      setError('Erro de conexao. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ShieldAlert size={48} color="#ef4444" />
          </View>
          <Text style={styles.title}>AntiPNR</Text>
          <Text style={styles.subtitle}>Rede de seguranca para entregadores</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar na sua conta</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Sua senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity onPress={togglePassword} style={styles.eyeIcon}>
                {showPassword ? (
                  <EyeOff size={18} color="#6b7280" />
                ) : (
                  <Eye size={18} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/register')}
            disabled={loading}>
            <Text style={styles.secondaryButtonText}>Criar conta gratuitamente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: 13,
    marginHorizontal: 12,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
