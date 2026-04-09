import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import {
  CircleAlert as AlertCircle,
  MessageSquare,
  ThumbsUp,
  Plus,
  Clock,
  TrendingUp,
  X,
  CircleCheck as CheckCircle,
  Heart,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import {
  Report,
  Tip,
  getRecentReports,
  getRecentTips,
  getCommunityStats,
  submitReport,
  confirmReport,
  likeTip,
  unlikeTip,
  getLikedTipIds,
  getConfirmedReportIds,
  getIssueTypeColor,
  getIssueTypeLabel,
  formatTimeAgo,
} from '@/services/dataService';

export default function ReportsScreen() {
  const { user } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [issueCounts, setIssueCounts] = useState({
    PNR: 0,
    'Difficult Location': 0,
    'Customer Dispute': 0,
    Other: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('PNR');
  const [reportAddress, setReportAddress] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const [reportsData, tipsData, statsData] = await Promise.all([
      getRecentReports(10),
      getRecentTips(5),
      getCommunityStats(),
    ]);
    setReports(reportsData);
    setTips(tipsData);
    setIssueCounts(statsData.issueCounts);
    setLoading(false);
  }, []);

  const loadUserInteractions = useCallback(async () => {
    if (!user) return;
    const [confirmedSet, likedSet] = await Promise.all([
      getConfirmedReportIds(user.id),
      getLikedTipIds(user.id),
    ]);
    setConfirmedIds(confirmedSet);
    setLikedIds(likedSet);
  }, [user]);

  useEffect(() => {
    loadData();
    loadUserInteractions();
  }, [loadData, loadUserInteractions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadUserInteractions()]);
    setRefreshing(false);
  }, [loadData, loadUserInteractions]);

  const handleConfirmReport = async (reportId: string) => {
    if (!user || confirmingId) return;
    if (confirmedIds.has(reportId)) return;

    setConfirmingId(reportId);
    const { error } = await confirmReport(reportId, user.id);
    if (!error) {
      setConfirmedIds((prev) => new Set([...prev, reportId]));
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, confirmations_count: r.confirmations_count + 1 } : r
        )
      );
    }
    setConfirmingId(null);
  };

  const handleLikeTip = async (tipId: string) => {
    if (!user || likingId) return;

    setLikingId(tipId);
    const alreadyLiked = likedIds.has(tipId);

    if (alreadyLiked) {
      const { error } = await unlikeTip(tipId, user.id);
      if (!error) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(tipId);
          return next;
        });
        setTips((prev) =>
          prev.map((t) => (t.id === tipId ? { ...t, likes_count: Math.max(0, t.likes_count - 1) } : t))
        );
      }
    } else {
      const { error } = await likeTip(tipId, user.id);
      if (!error) {
        setLikedIds((prev) => new Set([...prev, tipId]));
        setTips((prev) =>
          prev.map((t) => (t.id === tipId ? { ...t, likes_count: t.likes_count + 1 } : t))
        );
      }
    }
    setLikingId(null);
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

  const issueTypeDisplay = [
    { key: 'PNR', label: 'PNR', color: '#ef4444', icon: '📦' },
    { key: 'Difficult Location', label: 'Local Dificil', color: '#f59e0b', icon: '📍' },
    { key: 'Customer Dispute', label: 'Disputa Cliente', color: '#6366f1', icon: '💬' },
    { key: 'Other', label: 'Outro', color: '#6b7280', icon: '❓' },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}>
        <View style={styles.header}>
          <Text style={styles.title}>Comunidade</Text>
          <Text style={styles.subtitle}>Relatos e Dicas dos Entregadores</Text>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.reportButton} onPress={openReportModal}>
            <Plus size={22} color="#ffffff" />
            <Text style={styles.reportButtonText}>Reportar Novo Problema</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.issueTypesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tipos de Problemas</Text>
            <TrendingUp size={20} color="#dc2626" />
          </View>
          <View style={styles.issueTypesGrid}>
            {issueTypeDisplay.map((type) => (
              <View key={type.key} style={styles.issueTypeCard}>
                <Text style={styles.issueTypeIcon}>{type.icon}</Text>
                <Text style={styles.issueTypeCount}>
                  {issueCounts[type.key as keyof typeof issueCounts]}
                </Text>
                <Text style={styles.issueTypeLabel}>{type.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Relatos Recentes</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#ef4444" />
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyBox}>
              <AlertCircle size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>Nenhum relato ainda. Seja o primeiro!</Text>
            </View>
          ) : (
            reports.map((report) => {
              const color = getIssueTypeColor(report.issue_type);
              const address = (report.addresses as any)?.address_text || 'Endereco nao encontrado';
              const isConfirmed = confirmedIds.has(report.id);
              const isConfirming = confirmingId === report.id;
              const isOwnReport = user?.id === report.driver_id;

              return (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportAddressRow}>
                      <AlertCircle size={18} color={color} />
                      <Text style={styles.reportAddress} numberOfLines={1}>{address}</Text>
                    </View>
                    <View style={styles.reportBadges}>
                      {report.is_verified && (
                        <View style={styles.verifiedBadge}>
                          <CheckCircle size={12} color="#10b981" />
                          <Text style={styles.verifiedText}>Verificado</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[styles.reportTypeTag, { backgroundColor: color + '20', borderColor: color }]}>
                    <Text style={[styles.reportTypeText, { color }]}>
                      {getIssueTypeLabel(report.issue_type)}
                    </Text>
                  </View>

                  {report.note ? (
                    <Text style={styles.reportNote} numberOfLines={2}>{report.note}</Text>
                  ) : null}

                  <View style={styles.reportFooter}>
                    <View style={styles.reportMeta}>
                      <Clock size={14} color="#94a3b8" />
                      <Text style={styles.reportTime}>{formatTimeAgo(report.created_at)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.confirmButton,
                        isConfirmed && styles.confirmButtonActive,
                        (isOwnReport || isConfirming) && styles.confirmButtonDisabled,
                      ]}
                      onPress={() => handleConfirmReport(report.id)}
                      disabled={isOwnReport || isConfirmed || isConfirming}>
                      {isConfirming ? (
                        <ActivityIndicator size="small" color={isConfirmed ? '#10b981' : '#64748b'} />
                      ) : (
                        <ThumbsUp size={14} color={isConfirmed ? '#10b981' : '#64748b'} />
                      )}
                      <Text style={[styles.confirmButtonText, isConfirmed && styles.confirmButtonTextActive]}>
                        {report.confirmations_count}
                        {isConfirmed ? ' Confirmado' : ' Confirmar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dicas Uteis</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#ef4444" />
          ) : tips.length === 0 ? (
            <View style={styles.emptyBox}>
              <MessageSquare size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>Nenhuma dica ainda.</Text>
            </View>
          ) : (
            tips.map((tip) => {
              const address = (tip.addresses as any)?.address_text || 'Endereco nao encontrado';
              const isLiked = likedIds.has(tip.id);
              const isLiking = likingId === tip.id;
              const isOwnTip = user?.id === tip.driver_id;

              return (
                <View key={tip.id} style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <MessageSquare size={18} color="#3b82f6" />
                    <Text style={styles.tipAddress} numberOfLines={1}>{address}</Text>
                  </View>

                  <Text style={styles.tipText}>{tip.tip_text}</Text>

                  <View style={styles.tipFooter}>
                    <Text style={styles.tipTime}>{formatTimeAgo(tip.created_at)}</Text>
                    <TouchableOpacity
                      style={[
                        styles.likeButton,
                        isLiked && styles.likeButtonActive,
                        (isOwnTip || isLiking) && styles.likeButtonDisabled,
                      ]}
                      onPress={() => handleLikeTip(tip.id)}
                      disabled={isOwnTip || isLiking}>
                      {isLiking ? (
                        <ActivityIndicator size="small" color={isLiked ? '#ef4444' : '#64748b'} />
                      ) : (
                        <Heart
                          size={14}
                          color={isLiked ? '#ef4444' : '#64748b'}
                          fill={isLiked ? '#ef4444' : 'transparent'}
                        />
                      )}
                      <Text style={[styles.likeButtonText, isLiked && styles.likeButtonTextActive]}>
                        {tip.likes_count}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

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
                  {(['PNR', 'Difficult Location', 'Customer Dispute', 'Other'] as const).map((type) => (
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
                  style={[styles.submitButton, submitting && styles.submitButtonDisabledStyle]}
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
  actionSection: { paddingHorizontal: 20, paddingVertical: 20 },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  reportButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  issueTypesSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.3 },
  issueTypesGrid: { flexDirection: 'row', gap: 10 },
  issueTypeCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  issueTypeIcon: { fontSize: 22, marginBottom: 6 },
  issueTypeCount: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  issueTypeLabel: { fontSize: 10, color: '#64748b', textAlign: 'center', fontWeight: '500' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  reportCard: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  reportAddress: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  reportBadges: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  reportTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  reportTypeText: { fontSize: 12, fontWeight: '700' },
  reportNote: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportTime: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 110,
    justifyContent: 'center',
  },
  confirmButtonActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  confirmButtonTextActive: { color: '#10b981' },
  tipCard: {
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
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipAddress: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  tipText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 },
  tipFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipTime: { fontSize: 13, color: '#94a3b8', flex: 1 },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  likeButtonActive: {
    backgroundColor: '#fff1f2',
    borderColor: '#ef4444',
  },
  likeButtonDisabled: { opacity: 0.5 },
  likeButtonText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  likeButtonTextActive: { color: '#ef4444' },
  bottomSpacing: { height: 20 },
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
  submitButtonDisabledStyle: { opacity: 0.6 },
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
