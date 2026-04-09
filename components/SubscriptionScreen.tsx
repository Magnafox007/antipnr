import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useState } from 'react';
import {
  Crown,
  Zap,
  Map,
  FileSpreadsheet,
  Ban as Ban,
  Search,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
} from 'lucide-react-native';

interface SubscriptionScreenProps {
  visible: boolean;
  onClose: () => void;
  currentPlan?: 'free' | 'pro';
  missedEarnings?: number;
}

const PRO_FEATURES = [
  {
    icon: Search,
    label: 'Buscas ilimitadas',
    description: 'Consulte qualquer endereco sem restricoes diarias',
  },
  {
    icon: FileSpreadsheet,
    label: 'Analisador de Rota',
    description: 'Importe Excel ou texto e analise multiplos enderecos de uma vez',
  },
  {
    icon: Map,
    label: 'Mapa de Risco completo',
    description: 'Visualize todos os pontos de risco no mapa interativo',
  },
  {
    icon: Ban,
    label: 'Sem anuncios',
    description: 'Experiencia limpa e focada, sem interrupcoes',
  },
];

const MONTHLY_PRICE = 19.9;
const ANNUAL_PRICE = 149.9;
const ANNUAL_MONTHLY_EQUIV = ANNUAL_PRICE / 12;

export default function SubscriptionScreen({
  visible,
  onClose,
  currentPlan = 'free',
  missedEarnings,
}: SubscriptionScreenProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const isPro = currentPlan === 'pro';
  const isAnnual = billing === 'annual';

  const displayPrice = isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE;
  const displayPeriod = isAnnual ? '/ano' : '/mes';
  const monthlyEquiv = isAnnual ? ANNUAL_MONTHLY_EQUIV : MONTHLY_PRICE;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Crown size={22} color="#dc2626" />
            <Text style={styles.headerTitle}>Planos AntiPNR</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>

          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <ShieldCheck size={40} color="#dc2626" />
            </View>
            <Text style={styles.heroTitle}>Proteja suas entregas</Text>
            <Text style={styles.heroSubtitle}>
              Acesse dados completos da comunidade e aumente sua seguranca nas ruas
            </Text>
          </View>

          {missedEarnings !== undefined && missedEarnings > 0 && (
            <View style={styles.warningBanner}>
              <TrendingDown size={20} color="#f59e0b" />
              <View style={styles.warningTextBox}>
                <Text style={styles.warningTitle}>Voce chegou ao limite hoje</Text>
                <Text style={styles.warningBody}>
                  Sem analisar o restante da rota, voce pode estar aceitando entregas de risco.
                  Entregadores Pro identificam ate R$ {missedEarnings.toFixed(0)} em rotas problematicas por dia.
                </Text>
              </View>
            </View>
          )}

          {missedEarnings === undefined && (
            <View style={styles.warningBanner}>
              <TrendingDown size={20} color="#f59e0b" />
              <View style={styles.warningTextBox}>
                <Text style={styles.warningTitle}>Limite gratuito atingido</Text>
                <Text style={styles.warningBody}>
                  Cada endereco nao verificado e uma entrega que pode virar problema. Membros Pro nao correm esse risco.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.billingToggleContainer}>
            <TouchableOpacity
              style={[styles.billingOption, !isAnnual && styles.billingOptionActive]}
              onPress={() => setBilling('monthly')}>
              <Text style={[styles.billingOptionText, !isAnnual && styles.billingOptionTextActive]}>
                Mensal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingOption, isAnnual && styles.billingOptionActive]}
              onPress={() => setBilling('annual')}>
              <Text style={[styles.billingOptionText, isAnnual && styles.billingOptionTextActive]}>
                Anual
              </Text>
              <View style={styles.savingBadge}>
                <Text style={styles.savingBadgeText}>-40%</Text>
              </View>
            </TouchableOpacity>
          </View>

          {isAnnual && (
            <View style={styles.bestDealBanner}>
              <Zap size={13} color="#fbbf24" />
              <Text style={styles.bestDealText}>MELHOR OFERTA — R$ 12,49/mes no plano anual</Text>
            </View>
          )}

          <View style={styles.proCard}>
            <View style={styles.proCardHeader}>
              <View style={styles.proTitleRow}>
                <Crown size={24} color="#dc2626" />
                <Text style={styles.proTitle}>Plano Pro</Text>
              </View>
              {isPro && (
                <View style={styles.activeBadge}>
                  <Check size={12} color="#10b981" />
                  <Text style={styles.activeBadgeText}>Ativo</Text>
                </View>
              )}
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.priceAmount}>
                R$ {displayPrice.toFixed(2).replace('.', ',')}
              </Text>
              <Text style={styles.pricePeriod}>{displayPeriod}</Text>
            </View>

            {isAnnual && (
              <Text style={styles.priceEquiv}>
                Equivale a R$ {monthlyEquiv.toFixed(2).replace('.', ',')}/mes
              </Text>
            )}

            {!isAnnual && (
              <Text style={styles.priceEquiv}>
                Ou R$ {ANNUAL_PRICE.toFixed(2).replace('.', ',')}/ano e economize 40%
              </Text>
            )}

            <View style={styles.proDivider} />

            <View style={styles.featuresList}>
              {PRO_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <View key={index} style={styles.featureRow}>
                    <View style={styles.featureIconBox}>
                      <Icon size={18} color="#dc2626" />
                    </View>
                    <View style={styles.featureTextBox}>
                      <Text style={styles.featureLabel}>{feature.label}</Text>
                      <Text style={styles.featureDesc}>{feature.description}</Text>
                    </View>
                    <Check size={16} color="#dc2626" />
                  </View>
                );
              })}
            </View>

            {!isPro && (
              <TouchableOpacity style={styles.proCtaButton} activeOpacity={0.85}>
                <Zap size={18} color="#ffffff" />
                <Text style={styles.proCtaText}>
                  Assinar por R$ {displayPrice.toFixed(2).replace('.', ',')}{displayPeriod}
                </Text>
                <ChevronRight size={18} color="#ffffff" />
              </TouchableOpacity>
            )}

            {isPro && (
              <View style={styles.proActiveBox}>
                <ShieldCheck size={20} color="#10b981" />
                <Text style={styles.proActiveText}>Voce ja e um membro Pro!</Text>
              </View>
            )}
          </View>

          <View style={styles.freeCard}>
            <View style={styles.freeTitleRow}>
              <Search size={20} color="#64748b" />
              <Text style={styles.freeTitle}>Plano Gratuito</Text>
              {!isPro && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Atual</Text>
                </View>
              )}
            </View>

            <View style={styles.freeLimitBox}>
              <Text style={styles.freeLimitNumber}>5</Text>
              <Text style={styles.freeLimitLabel}>buscas por dia</Text>
            </View>

            <View style={styles.freeFeaturesList}>
              <View style={styles.freeFeatureRow}>
                <Check size={14} color="#64748b" />
                <Text style={styles.freeFeatureText}>Consulta basica de enderecos</Text>
              </View>
              <View style={styles.freeFeatureRow}>
                <Check size={14} color="#64748b" />
                <Text style={styles.freeFeatureText}>Envio de relatos</Text>
              </View>
              <View style={styles.freeFeatureRow}>
                <Check size={14} color="#64748b" />
                <Text style={styles.freeFeatureText}>Acesso a comunidade</Text>
              </View>
              <View style={[styles.freeFeatureRow, styles.freeFeatureRowDisabled]}>
                <X size={14} color="#ef4444" />
                <Text style={styles.freeFeatureTextDisabled}>Analisador de Rota (Excel/Texto)</Text>
              </View>
              <View style={[styles.freeFeatureRow, styles.freeFeatureRowDisabled]}>
                <X size={14} color="#ef4444" />
                <Text style={styles.freeFeatureTextDisabled}>Mapa de Risco completo</Text>
              </View>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Cancele a qualquer momento. Suporte 24h para membros Pro.
          </Text>
        </ScrollView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dc262630',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#431407',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#92400e',
  },
  warningTextBox: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
  warningBody: {
    fontSize: 13,
    color: '#fde68a',
    lineHeight: 19,
  },
  billingToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  billingOptionTextActive: {
    color: '#f1f5f9',
  },
  savingBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  bestDealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#451a03',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#92400e',
  },
  bestDealText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  proCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#dc2626',
    marginBottom: 16,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  proTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#052e16',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f1f5f9',
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  priceEquiv: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  proDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 20,
  },
  featuresList: {
    gap: 16,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dc262640',
  },
  featureTextBox: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  proCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 18,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  proCtaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  proActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#052e16',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  proActiveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  freeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  freeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  freeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
    flex: 1,
  },
  currentBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#475569',
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  freeLimitBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  freeLimitNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f1f5f9',
  },
  freeLimitLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  freeFeaturesList: {
    gap: 12,
  },
  freeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  freeFeatureRowDisabled: {
    opacity: 0.5,
  },
  freeFeatureText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  freeFeatureTextDisabled: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  disclaimer: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
});
