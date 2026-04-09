import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, ListFilter as Filter, TrendingUp, CircleAlert as AlertCircle } from 'lucide-react-native';
import {
  Address,
  ZoneStats,
  getTopRiskAddresses,
  getZoneStats,
  getRiskLevel,
  getRiskColor,
} from '@/services/dataService';

export default function MapScreen() {
  const [zones, setZones] = useState<ZoneStats[]>([]);
  const [topRisk, setTopRisk] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [zonesData, riskData] = await Promise.all([
      getZoneStats(),
      getTopRiskAddresses(5),
    ]);
    setZones(zonesData);
    setTopRisk(riskData);
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

  const getRiskLevelLabel = (level: string) => {
    if (level === 'high') return 'Alto Risco';
    if (level === 'medium') return 'Moderado';
    return 'Baixo Risco';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}>
        <View style={styles.header}>
          <Text style={styles.title}>Mapa de Risco</Text>
          <Text style={styles.subtitle}>Zonas de alto risco na sua cidade</Text>
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.primaryControl}>
            <Navigation size={20} color="#ffffff" />
            <Text style={styles.primaryControlText}>Minha Localizacao</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryControl}>
            <Filter size={20} color="#0f172a" />
            <Text style={styles.secondaryControlText}>Filtros</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapPlaceholder}>
          <View style={styles.mapIconContainer}>
            <MapPin size={56} color="#dc2626" />
          </View>
          <Text style={styles.mapPlaceholderTitle}>Mapa de Calor Interativo</Text>
          <Text style={styles.mapPlaceholderText}>
            Zonas de risco codificadas por cores baseadas em relatos da comunidade
          </Text>
          <View style={styles.mapBadges}>
            <View style={styles.mapBadge}>
              <View style={[styles.mapBadgeDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.mapBadgeText}>Seguro</Text>
            </View>
            <View style={styles.mapBadge}>
              <View style={[styles.mapBadgeDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.mapBadgeText}>Moderado</Text>
            </View>
            <View style={styles.mapBadge}>
              <View style={[styles.mapBadgeDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.mapBadgeText}>Alto Risco</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Zonas de Risco</Text>
            <TrendingUp size={20} color="#dc2626" />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#ef4444" />
            </View>
          ) : zones.length === 0 ? (
            <View style={styles.emptyBox}>
              <MapPin size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>Nenhuma zona com dados ainda.</Text>
            </View>
          ) : (
            zones.map((zone) => (
              <TouchableOpacity key={zone.zone} style={styles.zoneCard} activeOpacity={0.7}>
                <View style={[styles.zoneColorBar, { backgroundColor: zone.color }]} />
                <View style={styles.zoneContent}>
                  <View style={styles.zoneHeader}>
                    <Text style={styles.zoneName}>{zone.zone}</Text>
                    <View style={[styles.zoneBadge, { backgroundColor: zone.color + '20', borderColor: zone.color }]}>
                      <Text style={[styles.zoneBadgeText, { color: zone.color }]}>
                        {getRiskLevelLabel(zone.riskLevel)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.zoneStats}>
                    <View style={styles.zoneStat}>
                      <AlertCircle size={16} color="#64748b" />
                      <Text style={styles.zoneStatText}>{zone.reports} relatos</Text>
                    </View>
                    <Text style={styles.zoneStatDivider}>•</Text>
                    <View style={styles.zoneStat}>
                      <MapPin size={16} color="#64748b" />
                      <Text style={styles.zoneStatText}>{zone.addresses} enderecos</Text>
                    </View>
                  </View>
                </View>
                <Navigation size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Enderecos Mais Arriscados</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#ef4444" />
          ) : topRisk.length === 0 ? (
            <View style={styles.emptyBox}>
              <AlertCircle size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>Nenhum endereco de risco ainda.</Text>
            </View>
          ) : (
            topRisk.map((item, index) => {
              const level = getRiskLevel(item.risk_score);
              const color = getRiskColor(level);
              return (
                <TouchableOpacity key={item.id} style={styles.addressCard} activeOpacity={0.7}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.addressContent}>
                    <Text style={styles.addressText} numberOfLines={2}>{item.address_text}</Text>
                    <View style={styles.addressMeta}>
                      <Text style={[styles.riskScore, { color }]}>Risco: {item.risk_score.toFixed(1)}/10</Text>
                      <Text style={styles.addressMetaDivider}>•</Text>
                      <Text style={styles.addressReports}>{item.total_reports} relatos</Text>
                      {item.zone ? (
                        <>
                          <Text style={styles.addressMetaDivider}>•</Text>
                          <Text style={styles.addressZone}>{item.zone}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <Navigation size={20} color="#cbd5e1" />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.infoCard}>
          <MapPin size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Toque em qualquer zona ou endereco para ver detalhes e navegar
          </Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  controlsSection: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  primaryControl: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryControlText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  secondaryControl: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryControlText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  mapPlaceholder: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mapIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  mapPlaceholderTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  mapBadges: { flexDirection: 'row', gap: 16 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapBadgeDot: { width: 12, height: 12, borderRadius: 6 },
  mapBadgeText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', letterSpacing: -0.3 },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  zoneColorBar: { width: 6, height: 72 },
  zoneContent: { flex: 1, padding: 16 },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  zoneName: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },
  zoneBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  zoneBadgeText: { fontSize: 12, fontWeight: '700' },
  zoneStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoneStatText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  zoneStatDivider: { fontSize: 13, color: '#cbd5e1' },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  addressContent: { flex: 1 },
  addressText: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 6, lineHeight: 20 },
  addressMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  riskScore: { fontSize: 13, fontWeight: '700' },
  addressMetaDivider: { fontSize: 13, color: '#cbd5e1' },
  addressReports: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  addressZone: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#1e40af', lineHeight: 20 },
  bottomSpacing: { height: 20 },
});
