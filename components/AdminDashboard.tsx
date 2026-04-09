import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Users, Crown, DollarSign, TriangleAlert as AlertTriangle, Clock, ArrowLeft, ListFilter as Filter, X, Check, MapPin, ShieldCheck } from 'lucide-react-native';
import {
  AdminStats,
  AdminUserProfile,
  getAdminStats,
  getAdminUsers,
  getRecentAddressActivity,
  updateUserPlan,
} from '@/services/adminService';

interface AdminDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminDashboard({ visible, onClose }: AdminDashboardProps) {
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
    if (visible) {
      setLoading(true);
      loadAll();
    }
  }, [visible]);

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
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <ArrowLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <ShieldCheck size={20} color="#dc2626" />
            <Text style={styles.headerTitle}>Painel Administrativo</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#dc2626" />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />
            }>

            <View style={styles.statsGrid}>
              {STAT_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <View key={i} style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: card.color + '20' }]}>
                      <Icon size={20} color={card.color} />
                    </View>
                    <Text style={styles.statValue}>{card.value}</Text>
                    <Text style={styles.statLabel}>{card.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Users size={16} color="#94a3b8" />
                  <Text style={styles.sectionTitle}>Usuarios Recentes</Text>
                </View>
                <TouchableOpacity
                  style={[styles.filterBtn, filterPro && styles.filterBtnActive]}
                  onPress={toggleFilter}>
                  <Filter size={13} color={filterPro ? '#dc2626' : '#64748b'} />
                  <Text style={[styles.filterBtnText, filterPro && styles.filterBtnTextActive]}>
                    Apenas PRO
                  </Text>
                  {filterPro && (
                    <X size={12} color="#dc2626" />
                  )}
                </TouchableOpacity>
              </View>

              {users.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Nenhum usuario encontrado.</Text>
                </View>
              ) : (
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>ID / Nome</Text>
                    <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' }]}>Plano</Text>
                    <Text style={[styles.tableHeaderText, { width: 52, textAlign: 'center' }]}>Data</Text>
                    <Text style={[styles.tableHeaderText, { width: 64, textAlign: 'center' }]}>Acao</Text>
                  </View>
                  {users.map((u) => (
                    <View key={u.id} style={styles.tableRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.userNameText} numberOfLines={1}>
                          {u.full_name || 'Sem nome'}
                        </Text>
                        <Text style={styles.userIdText} numberOfLines={1}>
                          {u.id.slice(0, 12)}...
                        </Text>
                      </View>

                      <View style={{ width: 60, alignItems: 'center' }}>
                        <View style={[styles.planBadge, u.plan_type === 'pro' ? styles.planBadgePro : styles.planBadgeFree]}>
                          {u.plan_type === 'pro' ? (
                            <Crown size={10} color="#dc2626" />
                          ) : null}
                          <Text style={[styles.planBadgeText, u.plan_type === 'pro' ? styles.planBadgeTextPro : styles.planBadgeTextFree]}>
                            {u.plan_type === 'pro' ? 'PRO' : 'FREE'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.userDateText, { width: 52, textAlign: 'center' }]}>
                        {formatDate(u.created_at)}
                      </Text>

                      <View style={{ width: 64, alignItems: 'center' }}>
                        <TouchableOpacity
                          style={[
                            styles.togglePlanBtn,
                            u.plan_type === 'pro' ? styles.togglePlanBtnDowngrade : styles.togglePlanBtnUpgrade,
                          ]}
                          onPress={() => handleTogglePlan(u)}
                          disabled={updatingId === u.id}>
                          {updatingId === u.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : u.plan_type === 'pro' ? (
                            <>
                              <X size={11} color="#64748b" />
                              <Text style={styles.togglePlanBtnTextDowngrade}>Free</Text>
                            </>
                          ) : (
                            <>
                              <Crown size={11} color="#ffffff" />
                              <Text style={styles.togglePlanBtnTextUpgrade}>PRO</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Clock size={16} color="#94a3b8" />
                <Text style={styles.sectionTitle}>Monitor de Atividade</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Ultimos 10 enderecos acessados no sistema</Text>

              {activity.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Nenhuma atividade registrada.</Text>
                </View>
              ) : (
                activity.map((item, i) => (
                  <View key={item.id} style={styles.activityRow}>
                    <View style={styles.activityIndex}>
                      <Text style={styles.activityIndexText}>{i + 1}</Text>
                    </View>
                    <MapPin size={14} color="#64748b" style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityAddress} numberOfLines={2}>
                        {item.address_text}
                      </Text>
                      <Text style={styles.activityTime}>{formatDateTime(item.updated_at)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
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
