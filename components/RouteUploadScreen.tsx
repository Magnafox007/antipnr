import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Upload, FileSpreadsheet, FileText, List, Zap, Lock, Crown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, checkAndIncrementSearch } from '@/services/profileService';
import SubscriptionScreen from './SubscriptionScreen';

interface RouteUploadScreenProps {
  onAnalysisComplete: (result: any) => void;
}

const FREE_DAILY_LIMIT = 5;

export default function RouteUploadScreen({ onAnalysisComplete }: RouteUploadScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [mode, setMode] = useState<'file' | 'text'>('text');
  const [textInput, setTextInput] = useState('');
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [dailySearchCount, setDailySearchCount] = useState(0);
  const [showSubscription, setShowSubscription] = useState(false);

  useEffect(() => {
    if (user) {
      getUserProfile(user.id).then((profile) => {
        if (profile) {
          setUserPlan(profile.plan_type);
          setDailySearchCount(profile.daily_search_count);
        }
      });
    }
  }, [user]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erro', 'Falha ao selecionar arquivo');
    }
  };

  const checkLimitAndProceed = async (): Promise<boolean> => {
    if (!user) return false;
    if (userPlan === 'pro') return true;

    const result = await checkAndIncrementSearch(user.id);
    if (!result.allowed) {
      setShowSubscription(true);
      return false;
    }
    setDailySearchCount(result.searchCount);
    return true;
  };

  const analyzeRoute = async () => {
    if (!selectedFile) {
      Alert.alert('Atenção', 'Selecione um arquivo primeiro');
      return;
    }

    const canProceed = await checkLimitAndProceed();
    if (!canProceed) return;

    setLoading(true);

    try {
      const fileType = selectedFile.name.endsWith('.csv') ? 'csv' : 'xlsx';

      const { analyzeRouteFile } = await import('../services/routeAnalyzerService');
      const result = await analyzeRouteFile(selectedFile.uri, fileType);

      if (result.highRiskAddresses > 0) {
        Alert.alert(
          'Aviso de Segurança',
          `${result.highRiskAddresses} endereço(s) de alto risco detectado(s) na sua rota!`,
          [{ text: 'Ver Detalhes', onPress: () => onAnalysisComplete(result) }]
        );
      } else {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error('Error analyzing route:', error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao analisar rota');
    } finally {
      setLoading(false);
    }
  };

  const analyzeTextRoute = async () => {
    if (!textInput.trim()) {
      Alert.alert('Atenção', 'Cole os endereços primeiro');
      return;
    }

    const canProceed = await checkLimitAndProceed();
    if (!canProceed) return;

    setLoading(true);

    try {
      const { analyzeTextRoute: analyzeTextRouteService } = await import('../services/routeAnalyzerService');
      const result = await analyzeTextRouteService(textInput);

      if (result.highRiskAddresses > 0) {
        Alert.alert(
          'Aviso de Segurança',
          `${result.highRiskAddresses} endereço(s) de alto risco detectado(s) na sua rota!`,
          [{ text: 'Ver Detalhes', onPress: () => onAnalysisComplete(result) }]
        );
      } else {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error('Error analyzing text route:', error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao analisar rota');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Zap size={48} color="#10B981" />
          <Text style={styles.title}>Analisador de Rota</Text>
          <Text style={styles.subtitle}>
            Cole seus endereços ou envie uma planilha para análise rápida
          </Text>
        </View>

        {userPlan === 'free' && (
          dailySearchCount >= FREE_DAILY_LIMIT ? (
            <TouchableOpacity style={styles.proBanner} onPress={() => setShowSubscription(true)} activeOpacity={0.85}>
              <Lock size={18} color="#dc2626" />
              <View style={styles.proBannerText}>
                <Text style={styles.proBannerTitle}>Limite diário atingido</Text>
                <Text style={styles.proBannerSubtitle}>Assine o Pro para análises ilimitadas</Text>
              </View>
              <Crown size={18} color="#dc2626" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.freeBanner} onPress={() => setShowSubscription(true)} activeOpacity={0.85}>
              <View style={styles.proBannerText}>
                <Text style={styles.freeBannerTitle}>Plano Gratuito</Text>
                <Text style={styles.freeBannerSubtitle}>
                  {FREE_DAILY_LIMIT - dailySearchCount} de {FREE_DAILY_LIMIT} análises restantes hoje
                </Text>
              </View>
              <Crown size={18} color="#d97706" />
            </TouchableOpacity>
          )
        )}

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]}
            onPress={() => setMode('text')}
          >
            <List size={20} color={mode === 'text' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.modeButtonText, mode === 'text' && styles.modeButtonTextActive]}>
              Colar Endereços
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'file' && styles.modeButtonActive]}
            onPress={() => setMode('file')}
          >
            <Upload size={20} color={mode === 'file' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.modeButtonText, mode === 'file' && styles.modeButtonTextActive]}>
              Enviar Arquivo
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'text' ? (
          <>
            <View style={styles.textInputSection}>
              <View style={styles.textInputHeader}>
                <List size={24} color="#10B981" />
                <Text style={styles.textInputTitle}>Cole seus endereços</Text>
              </View>
              <Text style={styles.textInputSubtitle}>
                Um endereço por linha - rápido e fácil
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder={'Digite os endereços aqui, um por linha...'}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={12}
                value={textInput}
                onChangeText={setTextInput}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text style={styles.addressCount}>
                {textInput.trim() ? textInput.trim().split('\n').filter(l => l.trim()).length : 0}{' '}
                endereço(s) detectado(s)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, styles.quickAnalyzeButton, (!textInput.trim() || loading) && styles.analyzeButtonDisabled]}
              onPress={analyzeTextRoute}
              disabled={!textInput.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Zap size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Análise Rápida</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.quickTipsSection}>
              <Text style={styles.quickTipsTitle}>Dicas Rápidas:</Text>
              <Text style={styles.quickTip}>• Cole direto do WhatsApp ou apps de entrega</Text>
              <Text style={styles.quickTip}>• Um endereço por linha</Text>
              <Text style={styles.quickTip}>• Análise em menos de 3 segundos</Text>
              <Text style={styles.quickTip}>• Até 100 endereços de uma vez</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.formatSection}>
          <Text style={styles.sectionTitle}>Formatos aceitos:</Text>
          <View style={styles.formatList}>
            <View style={styles.formatItem}>
              <FileSpreadsheet size={24} color="#10B981" />
              <Text style={styles.formatText}>Excel (.xlsx)</Text>
            </View>
            <View style={styles.formatItem}>
              <FileText size={24} color="#10B981" />
              <Text style={styles.formatText}>CSV (.csv)</Text>
            </View>
          </View>
        </View>

        <View style={styles.columnsSection}>
          <Text style={styles.sectionTitle}>Colunas esperadas no arquivo:</Text>
          <View style={styles.columnList}>
            <Text style={styles.columnItem}>• Address (endereço completo)</Text>
            <Text style={styles.columnItem}>ou</Text>
            <Text style={styles.columnItem}>• Street (rua)</Text>
            <Text style={styles.columnItem}>• Number (número)</Text>
            <Text style={styles.columnItem}>• City (cidade) - opcional</Text>
          </View>
        </View>

        {selectedFile && (
          <View style={styles.selectedFile}>
            <Text style={styles.selectedFileLabel}>Arquivo selecionado:</Text>
            <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
            <Text style={styles.selectedFileSize}>
              {((selectedFile.size ?? 0) / 1024).toFixed(2)} KB
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.selectButton]}
          onPress={pickDocument}
          disabled={loading}
        >
          <Upload size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {selectedFile ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <TouchableOpacity
            style={[styles.button, styles.analyzeButton]}
            onPress={analyzeRoute}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>Analisar Rota</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Como funciona:</Text>
          <Text style={styles.infoText}>
            1. Faça upload da sua planilha de entregas{'\n'}
            2. O sistema busca cada endereço na base de dados{'\n'}
            3. Identifica endereços com relatos de problemas{'\n'}
            4. Classifica o risco de cada entrega{'\n'}
            5. Exibe um relatório completo da sua rota
          </Text>
        </View>

            <View style={styles.riskLegend}>
              <Text style={styles.legendTitle}>Legenda de Risco:</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.legendText}>Verde: Endereço seguro</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
                <Text style={styles.legendText}>Amarelo: Atenção (1-2 relatos)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
                <Text style={styles.legendText}>Laranja: Risco moderado (3-5 relatos)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Vermelho: Alto risco (6+ relatos)</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <SubscriptionScreen
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
        currentPlan={userPlan}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  formatSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  formatList: {
    flexDirection: 'row',
    gap: 16,
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formatText: {
    fontSize: 14,
    color: '#374151',
  },
  columnsSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  columnList: {
    gap: 6,
  },
  columnItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  selectedFile: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectedFileLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedFileName: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#60A5FA',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  selectButton: {
    backgroundColor: '#3B82F6',
  },
  analyzeButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0C4A6E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 22,
  },
  riskLegend: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#374151',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  textInputSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  textInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  textInputSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  textArea: {
    fontSize: 14,
    color: '#111827',
    minHeight: 200,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    lineHeight: 22,
  },
  addressCount: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'right',
  },
  quickAnalyzeButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  quickTipsSection: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  quickTipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  quickTip: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 20,
    marginBottom: 4,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 12,
  },
  freeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 12,
  },
  proBannerText: {
    flex: 1,
  },
  proBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2,
  },
  proBannerSubtitle: {
    fontSize: 12,
    color: '#b91c1c',
  },
  freeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  freeBannerSubtitle: {
    fontSize: 12,
    color: '#b45309',
  },
});
