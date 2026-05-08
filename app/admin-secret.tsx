import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogOut,
  Users,
  Crown,
  DollarSign,
  TriangleAlert as AlertTriangle,
  Clock,
  ListFilter as Filter,
  X,
  MapPin,
} from 'lucide-react-native';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  AdminStats,
  AdminUserProfile,
  getAdminStats,
  getAdminUsers,
  getRecentAddressActivity,
  updateUserPlan,
} from '@/services/adminService';

function AdminLoginScreen() {
  const { adminSignIn, adminLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      router.replace('/login');
      return;
    }
    const { error: signInError } = await adminSignIn(email.trim(), password);
    if (signInError) {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={loginStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={loginStyles.keyboardView}>
        <View style={loginStyles.content}>
          <View style={loginStyles.iconWrap}>
            <ShieldCheck size={40} color="#dc2626" />
          </View>
          <Text style={loginStyles.title}>Acesso Restrito</Text>
          <Text style={loginStyles.subtitle}>Somente administradores autorizados</Text>

          {error ? <Text style={loginStyles.errorText}>{error}</Text> : null}

          <View style={loginStyles.inputGroup}>
            <View style={loginStyles.inputWrap}>
              <Mail size={18} color="#475569" style={loginStyles.inputIcon} />
              <TextInput
                style={loginStyles.input}
                placeholder="E-mail"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={loginStyles.inputWrap}>
              <Lock size={18} color="#475569" style={loginStyles.inputIcon} />
              <TextInput
                style={loginStyles.input}
                placeholder="Senha"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={loginStyles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}>
                {showPassword ? (
                  <EyeOff size={18} color="#475569" />
                ) : (
                  <Eye size={18} color="#475569" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={loginStyles.button}
            onPress={handleLogin}
            disabled={adminLoading}
            activeOpacity={0.85}>
            {adminLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={loginStyles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AdminPanelScreen() {
  const { adminSignOut } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [activity, setActivity] = useState<{ id: string; address_text: string; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterPro, setFilterPro] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAll = useCallback(async (proOnly = filterPro) => {
    const [statsData, usersData, activityData] = await Promise.all([
      getAdminStats(),
      getAdminUsers(proOnly),
      getRecentAddressActivity(),
    ]);
    setStats(statsData);
    setUsers(usersData);
    setActivity(activityData);
    setLoading(false);
  }, [filterPro]);

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const toggleFilter = async () => {
    const next = !filterPro;
    setFilterPro(next);
    setLoading(true);
    const updated = await getAdminUsers(next);
    setUsers(updated);
    setLoading(false);
  };

  const handleTogglePlan = async (user: AdminUserProfile) => {
    if (updatingId) return;
    const nextPlan = user.plan_type === 'pro' ? 'free' : 'pro';
    setUpdatingId(user.id);
    const { error } = await updateUserPlan(user.id, nextPlan);
    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, plan_type: nextPlan } : u))
      );
      if (stats) {
        const delta = nextPlan === 'pro' ? 1 : -1;
        const newPro = stats.totalPro + delta;
        setStats({ ...stats, totalPro: newPro, estimatedRevenue: newPro * 19.9 });
      }
    }
    setUpdatingId(null);
  };

  const handleSignOut = () => {
    adminSignOut();
    router.replace('/login');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
      return '—';
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const STAT_CARDS = stats
    ? [
        { label: 'Usuarios', value: stats.totalUsers.toString(), icon: Users, color: '#3b82f6' },
        { label: 'Assinantes PRO', value: stats.totalPro.toString(), icon: Crown, color: '#dc2626' },
        {
          label: 'Receita Estimada',
          value: `R$ ${stats.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: DollarSign,
          color: '#10b981',
        },
        { label: 'Total de Relatos', value: stats.totalReports.toString(), icon: AlertTriangle, color: '#f59e0b' },
      ]
    : [];

  return (
    <SafeAreaView style={panelStyles.container}>
      <View style={panelStyles.header}>
        <View style={panelStyles.headerTitleRow}>
          <ShieldCheck size={20} color="#dc2626" />
          <Text style={panelStyles.headerTitle}>Painel Admin</Text>
        </View>
        <TouchableOpacity style={panelStyles.logoutBtn} onPress={handleSignOut}>
          <LogOut size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={panelStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={panelStyles.loadingText}>Carregando dados...</Text>
        </View>
      ) : (
        <ScrollView
          style={panelStyles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />
          }>

          <View style={panelStyles.statsGrid}>
            {STAT_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <View key={i} style={panelStyles.statCard}>
                  <View style={[panelStyles.statIconBox, { backgroundColor: card.color + '20' }]}>
                    <Icon size={20} color={card.color} />
                  </View>
                  <Text style={panelStyles.statValue}>{card.value}</Text>
                  <Text style={panelStyles.statLabel}>{card.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={panelStyles.section}>
            <View style={panelStyles.sectionHeaderRow}>
              <View style={panelStyles.sectionTitleRow}>
                <Users size={16} color="#94a3b8" />
                <Text style={panelStyles.sectionTitle}>Usuarios Recentes</Text>
              </View>
              <TouchableOpacity
                style={[panelStyles.filterBtn, filterPro && panelStyles.filterBtnActive]}
                onPress={toggleFilter}>
                <Filter size={13} color={filterPro ? '#dc2626' : '#64748b'} />
                <Text style={[panelStyles.filterBtnText, filterPro && panelStyles.filterBtnTextActive]}>
                  Apenas PRO
                </Text>
                {filterPro && <X size={12} color="#dc2626" />}
              </TouchableOpacity>
            </View>

            {users.length === 0 ? (
              <View style={panelStyles.emptyBox}>
                <Text style={panelStyles.emptyText}>Nenhum usuario encontrado.</Text>
              </View>
            ) : (
              <View style={panelStyles.tableContainer}>
                <View style={panelStyles.tableHeader}>
                  <Text style={[panelStyles.tableHeaderText, { flex: 1 }]}>ID / Nome</Text>
                  <Text style={[panelStyles.tableHeaderText, { width: 60, textAlign: 'center' }]}>Plano</Text>
                  <Text style={[panelStyles.tableHeaderText, { width: 52, textAlign: 'center' }]}>Data</Text>
                  <Text style={[panelStyles.tableHeaderText, { width: 64, textAlign: 'center' }]}>Acao</Text>
                </View>
                {users.map((u) => (
                  <View key={u.id} style={panelStyles.tableRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={panelStyles.userNameText} numberOfLines={1}>
                        {u.full_name || 'Sem nome'}
                      </Text>
                      <Text style={panelStyles.userIdText} numberOfLines={1}>
                        {u.id.slice(0, 12)}...
                      </Text>
                    </View>

                    <View style={{ width: 60, alignItems: 'center' }}>
                      <View style={[panelStyles.planBadge, u.plan_type === 'pro' ? panelStyles.planBadgePro : panelStyles.planBadgeFree]}>
                        {u.plan_type === 'pro' ? <Crown size={10} color="#dc2626" /> : null}
                        <Text style={[panelStyles.planBadgeText, u.plan_type === 'pro' ? panelStyles.planBadgeTextPro : panelStyles.planBadgeTextFree]}>
                          {u.plan_type === 'pro' ? 'PRO' : 'FREE'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[panelStyles.userDateText, { width: 52, textAlign: 'center' }]}>
                      {formatDate(u.created_at)}
                    </Text>

                    <View style={{ width: 64, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={[
                          panelStyles.togglePlanBtn,
                          u.plan_type === 'pro' ? panelStyles.togglePlanBtnDowngrade : panelStyles.togglePlanBtnUpgrade,
                        ]}
                        onPress={() => handleTogglePlan(u)}
                        disabled={updatingId === u.id}>
                        {updatingId === u.id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : u.plan_type === 'pro' ? (
                          <>
                            <X size={11} color="#64748b" />
                            <Text style={panelStyles.togglePlanBtnTextDowngrade}>Free</Text>
                          </>
                        ) : (
                          <>
                            <Crown size={11} color="#ffffff" />
                            <Text style={panelStyles.togglePlanBtnTextUpgrade}>PRO</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={panelStyles.section}>
            <View style={panelStyles.sectionTitleRow}>
              <Clock size={16} color="#94a3b8" />
              <Text style={panelStyles.sectionTitle}>Monitor de Atividade</Text>
            </View>
            <Text style={panelStyles.sectionSubtitle}>Ultimos 10 enderecos acessados no sistema</Text>

            {activity.length === 0 ? (
              <View style={panelStyles.emptyBox}>
                <Text style={panelStyles.emptyText}>Nenhuma atividade registrada.</Text>
              </View>
            ) : (
              activity.map((item, i) => (
                <View key={item.id} style={panelStyles.activityRow}>
                  <View style={panelStyles.activityIndex}>
                    <Text style={panelStyles.activityIndexText}>{i + 1}</Text>
                  </View>
                  <MapPin size={14} color="#64748b" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={panelStyles.activityAddress} numberOfLines={2}>
                      {item.address_text}
                    </Text>
                    <Text style={panelStyles.activityTime}>{formatDateTime(item.updated_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function AdminSecretContent() {
  const { isAdminAuthenticated } = useAdminAuth();
  return isAdminAuthenticated ? <AdminPanelScreen /> : <AdminLoginScreen />;
}

export default function AdminSecretRoute() {
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (loading || checkedRef.current) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    checkedRef.current = true;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role;
      if (role === 'master_admin' || role === 'admin') {
        setAuthorized(true);
      } else {
        router.replace('/login');
      }
      setChecking(false);
    })();
  }, [user, loading]);

  if (loading || checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  if (!authorized) return null;

  return (
    <AdminAuthProvider>
      <AdminSecretContent />
    </AdminAuthProvider>
  );
}

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#f1f5f9',
  },
  eyeBtn: {
    padding: 4,
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

const panelStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  scroll: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: -10,
    marginBottom: 14,
    marginLeft: 24,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterBtnActive: {
    backgroundColor: '#1a0a0a',
    borderColor: '#dc2626',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterBtnTextActive: {
    color: '#dc2626',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
  },
  emptyText: {
    fontSize: 13,
    color: '#475569',
  },
  tableContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  userIdText: {
    fontSize: 10,
    color: '#475569',
    fontFamily: 'monospace',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planBadgePro: {
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  planBadgeFree: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planBadgeTextPro: {
    color: '#dc2626',
  },
  planBadgeTextFree: {
    color: '#475569',
  },
  userDateText: {
    fontSize: 11,
    color: '#475569',
  },
  togglePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 52,
    minHeight: 28,
  },
  togglePlanBtnUpgrade: {
    backgroundColor: '#dc2626',
  },
  togglePlanBtnDowngrade: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  togglePlanBtnTextUpgrade: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  togglePlanBtnTextDowngrade: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityIndex: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  activityAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#475569',
  },
});
