import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Clipboard,
} from 'react-native';
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, CircleAlert as AlertCircle, Circle as XCircle, MapPin, Navigation, Info, ChevronDown, ChevronUp, Copy } from 'lucide-react-native';
import { RouteAnalysisResult, RouteAddressWithRisk } from '../services/routeAnalyzerService';

interface RouteAnalysisResultScreenProps {
  result: RouteAnalysisResult;
  onBack: () => void;
  onViewAddress?: (addressId: string) => void;
}

export default function RouteAnalysisResultScreen({
  result,
  onBack,
  onViewAddress,
}: RouteAnalysisResultScreenProps) {
  const [expandedAddresses, setExpandedAddresses] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedAddresses);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedAddresses(newExpanded);
  };

  const openInMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Google Maps');
    });
  };

  const copyAddress = (address: string) => {
    Clipboard.setString(address);
    Alert.alert('Copiado!', 'Endereço copiado para a área de transferência');
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'safe':
        return <CheckCircle size={20} color="#22C55E" />;
      case 'attention':
        return <AlertTriangle size={20} color="#EAB308" />;
      case 'moderate':
        return <AlertCircle size={20} color="#F97316" />;
      case 'high':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return <Info size={20} color="#6B7280" />;
    }
  };

  const getRiskLabel = (level: string): string => {
    switch (level) {
      case 'safe':
        return 'Seguro';
      case 'attention':
        return 'Atenção';
      case 'moderate':
        return 'Risco Moderado';
      case 'high':
        return 'Alto Risco';
      default:
        return 'Desconhecido';
    }
  };

  const sortedAddresses = [...result.addresses].sort((a, b) => {
    const riskOrder = { high: 0, moderate: 1, attention: 2, safe: 3 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Análise da Rota</Text>
          <Text style={styles.timestamp}>
            Processado em {result.processedAt.toLocaleString('pt-BR')}
          </Text>
        </View>

        {result.highRiskAddresses > 0 && (
          <View style={styles.warningBanner}>
            <XCircle size={24} color="#DC2626" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>⚠️ Alerta de Segurança</Text>
              <Text style={styles.warningText}>
                {result.highRiskAddresses} endereço(s) de alto risco detectado(s) na sua rota.
                Tenha cuidado extra!
              </Text>
            </View>
          </View>
        )}

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumo da Rota</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{result.totalAddresses}</Text>
              <Text style={styles.summaryLabel}>Total de Endereços</Text>
            </View>

            <View style={[styles.summaryCard, styles.safeCard]}>
              <CheckCircle size={28} color="#22C55E" />
              <Text style={styles.summaryNumber}>{result.safeAddresses}</Text>
              <Text style={styles.summaryLabel}>Seguros</Text>
            </View>

            <View style={[styles.summaryCard, styles.attentionCard]}>
              <AlertTriangle size={28} color="#EAB308" />
              <Text style={styles.summaryNumber}>{result.attentionAddresses}</Text>
              <Text style={styles.summaryLabel}>Atenção</Text>
            </View>

            <View style={[styles.summaryCard, styles.moderateCard]}>
              <AlertCircle size={28} color="#F97316" />
              <Text style={styles.summaryNumber}>{result.moderateRiskAddresses}</Text>
              <Text style={styles.summaryLabel}>Risco Moderado</Text>
            </View>

            <View style={[styles.summaryCard, styles.highCard]}>
              <XCircle size={28} color="#EF4444" />
              <Text style={styles.summaryNumber}>{result.highRiskAddresses}</Text>
              <Text style={styles.summaryLabel}>Alto Risco</Text>
            </View>
          </View>

          {result.safeAddresses > 0 && (
            <View style={styles.percentageBar}>
              <View
                style={[
                  styles.percentageFill,
                  styles.safeFill,
                  { width: `${(result.safeAddresses / result.totalAddresses) * 100}%` },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.addressSection}>
          <Text style={styles.addressTitle}>Lista de Endereços</Text>
          <Text style={styles.addressSubtitle}>Ordenados por nível de risco</Text>

          {sortedAddresses.map((address, index) => (
            <View key={index} style={styles.addressCard}>
              <TouchableOpacity
                style={styles.addressHeader}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <View style={styles.addressHeaderLeft}>
                  <View style={[styles.riskIndicator, { backgroundColor: address.riskColor }]} />
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {address.originalAddress}
                    </Text>
                    <View style={styles.addressMeta}>
                      {getRiskIcon(address.riskLevel)}
                      <Text style={styles.riskText}>{getRiskLabel(address.riskLevel)}</Text>
                      {address.reportCount > 0 && (
                        <Text style={styles.reportCount}>• {address.reportCount} relato(s)</Text>
                      )}
                    </View>
                  </View>
                </View>
                {expandedAddresses.has(index) ? (
                  <ChevronUp size={20} color="#6B7280" />
                ) : (
                  <ChevronDown size={20} color="#6B7280" />
                )}
              </TouchableOpacity>

              {expandedAddresses.has(index) && (
                <View style={styles.addressDetails}>
                  {address.hasMatch ? (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Pontuação de Risco:</Text>
                        <Text style={styles.detailValue}>{address.riskScore.toFixed(1)}/10</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total de Relatos:</Text>
                        <Text style={styles.detailValue}>{address.reportCount}</Text>
                      </View>
                      {address.city && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Cidade:</Text>
                          <Text style={styles.detailValue}>{address.city}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={styles.noDataText}>
                      Nenhum relato encontrado para este endereço
                    </Text>
                  )}

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.mapsButton]}
                      onPress={() => openInMaps(address.originalAddress)}
                    >
                      <Navigation size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Maps</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.copyButton]}
                      onPress={() => copyAddress(address.originalAddress)}
                    >
                      <Copy size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Copiar</Text>
                    </TouchableOpacity>

                    {address.matchedAddressId && onViewAddress && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.detailsButton]}
                        onPress={() => onViewAddress(address.matchedAddressId!)}
                      >
                        <MapPin size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Detalhes</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Analisar Nova Rota</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  warningBanner: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  safeCard: {
    backgroundColor: '#F0FDF4',
  },
  attentionCard: {
    backgroundColor: '#FEFCE8',
  },
  moderateCard: {
    backgroundColor: '#FFF7ED',
  },
  highCard: {
    backgroundColor: '#FEF2F2',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  percentageBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
  },
  safeFill: {
    backgroundColor: '#22C55E',
  },
  addressSection: {
    marginBottom: 16,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  addressSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  addressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  riskIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  addressInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  addressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reportCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addressDetails: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  mapsButton: {
    backgroundColor: '#3B82F6',
  },
  copyButton: {
    backgroundColor: '#8B5CF6',
  },
  detailsButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
