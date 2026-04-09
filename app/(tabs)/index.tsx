import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle,
  MapPin,
  Plus,
  Navigation,
  ExternalLink,
  X,
  ThumbsUp,
  MessageSquare,
  Share2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  Address,
  Tip,
  searchAddresses,
  getTopRiskAddresses,
  getCommunityStats,
  getAddressTips,
  submitReport,
  getRiskLevel,
  getRiskColor,
  getIssueTypeLabel,
  getRecentReports,
  confirmReport,
  getConfirmedReportIds,
  Report,
} from '@/services/dataService';
import { checkAndIncrementSearch } from '@/services/profileService';
import SubscriptionScreen from '@/components/SubscriptionScreen';
import AdBanner from '@/components/AdBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Address[]>([]);
  const [searching, setSearching] = useState(false);
  const [topRisk, setTopRisk] = useState<Address[]>([]);
  const [stats, setStats] = useState({ totalAddresses: 0, totalReports: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressTips, setAddressTips] = useState<Tip[]>([]);
  const [addressReports, setAddressReports] = useState<Report[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [loadingTips, setLoadingTips] = useState(false);

  const [showSubscription, setShowSubscription] = useState(false);
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [searchCount, setSearchCount] = useState(0);

  const MISSED_EARNINGS_PER_UNSCANNED = 45;

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('PNR');
  const [reportAddress, setReportAddress] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const [riskData, statsData] = await Promise.all([
      getTopRiskAddresses(5),
      getCommunityStats(),
    ]);
    setTopRisk(riskData);
    setStats({ totalAddresses: statsData.totalAddresses, totalReports: statsData.totalReports });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (user) {
        const { allowed, plan, searchCount } = await checkAndIncrementSearch(user.id);
        setUserPlan(plan);
        setSearchCount(searchCount);
        if (!allowed) {
          setShowSubscription(true);
          setSearchQuery('');
          return;
        }
      }
      setSearching(true);
      const results = await searchAddresses(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const openAddressDetail = async (address: Address) => {
    setSelectedAddress(address);
    setLoadingTips(true);
    const [tips, reports, confirmedSet] = await Promise.all([
      getAddressTips(address.id),
      getRecentReports(5),
      user ? getConfirmedReportIds(user.id) : Promise.resolve(new Set<string>()),
    ]);
    const filtered = reports.filter((r) => r.address_id === address.id);
    setAddressTips(tips);
    setAddressReports(filtered);
    setConfirmedIds(confirmedSet);
    setLoadingTips(false);
  };

  const closeAddressDetail = () => {
    setSelectedAddress(null);
    setAddressTips([]);
    setAddressReports([]);
  };

  const handleConfirmReport = async (reportId: string) => {
    if (!user || confirmingId || confirmedIds.has(reportId)) return;
    setConfirmingId(reportId);
    const { error } = await confirmReport(reportId, user.id);
    if (!error) {
      setConfirmedIds((prev) => new Set([...prev, reportId]));
      setAddressReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, confirmations_count: r.confirmations_count + 1 } : r
        )
      );
    }
    setConfirmingId(null);
  };

  const openReportModal = () => {
    setShowReportModal(true);
    setReportError(null);
    setReportSuccess(false);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportType('PNR');
    setReportAddress('');
    setReportNote('');
    setReportError(null);
    setReportSuccess(false);
  };

  const handleSubmitReport = async () => {
    if (!reportAddress.trim()) {
      setReportError('Informe o endereco.');
      return;
    }
    if (!user) return;
    setReportError(null);
    setSubmitting(true);
    const { error } = await submitReport(reportAddress, reportType, reportNote, user.id);
    setSubmitting(false);
    if (error) {
      setReportError(error);
    } else {
      setReportSuccess(true);
      await loadData();
      setTimeout(closeReportModal, 1500);
    }
  };

  const displayList = searchQuery.trim() ? searchResults : topRisk;
  const listTitle = searchQuery.trim() ? 'Resultados da Busca' : 'Enderecos Mais Arriscados';

  const getRiskIcon = (score: number) => {
    const level = getRiskLevel(score);
    const color = getRiskColor(level);
    if (level === 'low') return <CheckCircle size={24} color={color} />;
    if (level === 'medium') return <AlertTriangle size={24} color={color} />;
    return <AlertCircle size={24} color={color} />;
  };

  const getRiskText = (score: number) => {
    const level = getRiskLevel(score);
    if (level === 'low') return 'Seguro';
    if (level === 'medium') return 'Atencao';
    return 'Alto Risco';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}>
        <View style={styles.header}>
          <Text style={styles.title}>AntiPNR</Text>
          <Text style={styles.subtitle}>Rede de Seguranca para Entregadores</Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Search size={22} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar endereco..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searching && <ActivityIndicator size="small" color="#ef4444" />}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.primaryActionButton} onPress={() => router.push('/route')}>
            <View style={styles.actionIconContainer}>
              <MapPin size={28} color="#ffffff" />
            </View>
            <Text style={styles.actionButtonLabel}>Analisar Rota</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionButton} onPress={openReportModal}>
            <View style={styles.actionIconContainer}>
              <Plus size={28} color="#ffffff" />
            </View>
            <Text style={styles.actionButtonLabel}>Reportar Problema</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionButton} onPress={() => router.push('/map')}>
            <View style={styles.actionIconContainer}>
              <Navigation size={28} color="#ffffff" />
            </View>
            <Text style={styles.actionButtonLabel}>Mapa de Risco</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionButton} onPress={() => router.push('/reports')}>
            <View style={styles.actionIconContainer}>
              <MessageSquare size={28} color="#ffffff" />
            </View>
            <Text style={styles.actionButtonLabel}>Comunidade</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{listTitle}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#ef4444" />
            </View>
          ) : displayList.length === 0 ? (
            <View style={styles.emptyBox}>
              <MapPin size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'Nenhum endereco encontrado' : 'Nenhum endereco registrado ainda'}
              </Text>
            </View>
          ) : (
            displayList.map((item) => {
              const level = getRiskLevel(item.risk_score);
              const color = getRiskColor(level);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.addressCard}
                  onPress={() => openAddressDetail(item)}
                  activeOpacity={0.7}>
                  <View style={styles.addressCardLeft}>
                    <View style={[styles.riskBadge, { backgroundColor: color + '20' }]}>
                      {getRiskIcon(item.risk_score)}
                    </View>
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressText} numberOfLines={2}>{item.address_text}</Text>
                      <View style={styles.addressMeta}>
                        <Text style={[styles.riskScoreText, { color }]}>
                          Risco: {item.risk_score.toFixed(1)}/10
                        </Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Text style={styles.reportsCount}>{item.total_reports} relatos</Text>
                        {item.zone ? (
                          <>
                            <Text style={styles.metaDivider}>•</Text>
                            <Text style={styles.reportsCount}>{item.zone}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <ExternalLink size={20} color="#9ca3af" />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Estatisticas da Comunidade</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalAddresses.toLocaleString('pt-BR')}</Text>
              <Text style={styles.statLabel}>Enderecos Monitorados</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalReports.toLocaleString('pt-BR')}</Text>
              <Text style={styles.statLabel}>Total de Relatos</Text>
            </View>
          </View>
        </View>

        <AdBanner userPlan={userPlan} />
      </ScrollView>

      <Modal
        visible={!!selectedAddress}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddressDetail}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalhes do Endereco</Text>
            <TouchableOpacity onPress={closeAddressDetail} style={styles.closeButton}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedAddress && (() => {
              const level = getRiskLevel(selectedAddress.risk_score);
              const color = getRiskColor(level);
              return (
                <>
                  <View style={[styles.riskScoreCard, { backgroundColor: color }]}>
                    <Text style={styles.riskScoreLabel}>Nivel de Risco</Text>
                    <Text style={styles.riskScoreBig}>{selectedAddress.risk_score.toFixed(1)}/10</Text>
                    <Text style={styles.riskStatusText}>{getRiskText(selectedAddress.risk_score)}</Text>
                  </View>

                  <View style={styles.addressDetailCard}>
                    <MapPin size={20} color="#6b7280" />
                    <Text style={styles.addressDetailText}>{selectedAddress.address_text}</Text>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <AlertCircle size={24} color="#ef4444" />
                      <Text style={styles.statItemNumber}>{selectedAddress.total_reports}</Text>
                      <Text style={styles.statItemLabel}>Relatos</Text>
                    </View>
                    <View style={styles.statItem}>
                      <MessageSquare size={24} color="#3b82f6" />
                      <Text style={styles.statItemNumber}>{addressTips.length}</Text>
                      <Text style={styles.statItemLabel}>Dicas</Text>
                    </View>
                    {selectedAddress.zone ? (
                      <View style={styles.statItem}>
                        <MapPin size={24} color="#6b7280" />
                        <Text style={styles.statItemNumber} numberOfLines={1}>{selectedAddress.zone}</Text>
                        <Text style={styles.statItemLabel}>Zona</Text>
                      </View>
                    ) : null}
                  </View>

                  {addressReports.length > 0 && (
                    <View style={styles.reportsSection}>
                      <Text style={styles.tipsSectionTitle}>Relatos deste Endereco</Text>
                      {addressReports.map((report) => {
                        const isConfirmed = confirmedIds.has(report.id);
                        const isConfirming = confirmingId === report.id;
                        const isOwn = user?.id === report.driver_id;
                        return (
                          <View key={report.id} style={styles.reportItem}>
                            <Text style={styles.reportItemType}>{getIssueTypeLabel(report.issue_type)}</Text>
                            {report.note ? <Text style={styles.reportItemNote} numberOfLines={2}>{report.note}</Text> : null}
                            <TouchableOpacity
                              style={[
                                styles.inlineConfirmBtn,
                                isConfirmed && styles.inlineConfirmBtnActive,
                                (isOwn || isConfirming) && styles.inlineConfirmBtnDisabled,
                              ]}
                              onPress={() => handleConfirmReport(report.id)}
                              disabled={isOwn || isConfirmed || isConfirming}>
                              {isConfirming ? (
                                <ActivityIndicator size="small" color={isConfirmed ? '#10b981' : '#64748b'} />
                              ) : (
                                <ThumbsUp size={13} color={isConfirmed ? '#10b981' : '#64748b'} />
                              )}
                              <Text style={[styles.inlineConfirmText, isConfirmed && styles.inlineConfirmTextActive]}>
                                {report.confirmations_count} {isConfirmed ? 'Confirmado' : 'Confirmar'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.tipsSection}>
                    <Text style={styles.tipsSectionTitle}>Dicas de Entrega</Text>
                    {loadingTips ? (
                      <ActivityIndicator color="#ef4444" />
                    ) : addressTips.length === 0 ? (
                      <Text style={styles.noTipsText}>Nenhuma dica registrada ainda.</Text>
                    ) : (
                      addressTips.map((tip) => (
                        <View key={tip.id} style={styles.tipItem}>
                          <View style={styles.tipBullet} />
                          <Text style={styles.tipText}>{tip.tip_text}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => {
                        closeAddressDetail();
                        router.push('/reports');
                      }}>
                      <ThumbsUp size={20} color="#10b981" />
                      <Text style={styles.confirmButtonText}>Ver Relatos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareButton}>
                      <Share2 size={20} color="#3b82f6" />
                      <Text style={styles.shareButtonText}>Compartilhar Alerta</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeReportModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reportar Problema</Text>
            <TouchableOpacity onPress={closeReportModal} style={styles.closeButton}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {reportSuccess ? (
              <View style={styles.successBox}>
                <CheckCircle size={40} color="#10b981" />
                <Text style={styles.successText}>Relato enviado com sucesso!</Text>
              </View>
            ) : (
              <>
                {reportError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{reportError}</Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Tipo de Problema</Text>
                <View style={styles.issueTypeGrid}>
                  {['PNR', 'Difficult Location', 'Customer Dispute', 'Other'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.issueTypeButton,
                        reportType === type && styles.issueTypeButtonActive,
                      ]}
                      onPress={() => setReportType(type)}>
                      <Text
                        style={[
                          styles.issueTypeButtonText,
                          reportType === type && styles.issueTypeButtonTextActive,
                        ]}>
                        {getIssueTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Endereco</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Digite o endereco da entrega..."
                  placeholderTextColor="#9ca3af"
                  value={reportAddress}
                  onChangeText={setReportAddress}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />

                <Text style={styles.inputLabel}>Observacoes (Opcional)</Text>
                <TextInput
                  style={styles.textInputLarge}
                  placeholder="Descreva o problema..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  value={reportNote}
                  onChangeText={setReportNote}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitReport}
                  disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Enviar Relato</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <SubscriptionScreen
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
        currentPlan={userPlan}
        missedEarnings={userPlan === 'free' ? (5 - Math.min(searchCount, 5)) * MISSED_EARNINGS_PER_UNSCANNED : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 36, fontWeight: 'bold', color: '#0f172a', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  searchSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 17, color: '#0f172a', fontWeight: '500' },
  quickActionsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  primaryActionButton: {
    flex: 1,
    minWidth: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryActionButton: {
    width: '31%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconContainer: { marginBottom: 8 },
  actionButtonLabel: { color: '#ffffff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.3 },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  addressCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  riskBadge: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addressInfo: { flex: 1 },
  addressText: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 6, lineHeight: 20 },
  addressMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskScoreText: { fontSize: 14, fontWeight: '700' },
  metaDivider: { fontSize: 14, color: '#cbd5e1' },
  reportsCount: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  statsSection: { paddingHorizontal: 20, marginBottom: 32 },
  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statNumber: { fontSize: 26, fontWeight: 'bold', color: '#dc2626', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748b', textAlign: 'center', fontWeight: '500' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  closeButton: { padding: 4 },
  modalContent: { flex: 1, paddingTop: 20 },
  riskScoreCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  riskScoreLabel: { fontSize: 14, fontWeight: '600', color: '#ffffff', opacity: 0.9, marginBottom: 8 },
  riskScoreBig: { fontSize: 56, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  riskStatusText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  addressDetailCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressDetailText: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500', lineHeight: 22 },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 24, gap: 12 },
  statItem: { flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 14, alignItems: 'center' },
  statItemNumber: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginTop: 8, marginBottom: 4 },
  statItemLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  tipsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
  },
  tipsSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  tipBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6', marginTop: 6 },
  tipText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20 },
  noTipsText: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },
  reportsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
  },
  reportItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 6,
  },
  reportItemType: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  reportItemNote: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  inlineConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inlineConfirmBtnActive: { backgroundColor: '#f0fdf4', borderColor: '#10b981' },
  inlineConfirmBtnDisabled: { opacity: 0.5 },
  inlineConfirmText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  inlineConfirmTextActive: { color: '#10b981' },
  actionButtons: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 24, gap: 12 },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  confirmButtonText: { color: '#10b981', fontSize: 15, fontWeight: '700' },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  shareButtonText: { color: '#3b82f6', fontSize: 15, fontWeight: '700' },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12, marginHorizontal: 20 },
  issueTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20, marginBottom: 24, gap: 10 },
  issueTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  issueTypeButtonActive: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
  issueTypeButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  issueTypeButtonTextActive: { color: '#dc2626' },
  textInput: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#0f172a',
    minHeight: 70,
  },
  textInputLarge: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#0f172a',
    minHeight: 100,
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#dc2626',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontSize: 14, fontWeight: '500' },
  successBox: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  successText: { fontSize: 18, fontWeight: '700', color: '#10b981' },
});
