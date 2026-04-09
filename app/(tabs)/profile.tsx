import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CircleUser as UserCircle,
  Mail,
  LogOut,
  ShieldAlert,
  ChevronRight,
  Bell,
  Circle as HelpCircle,
  Crown,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SubscriptionScreen from '@/components/SubscriptionScreen';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [planType, setPlanType] = useState<'free' | 'pro'>('free');
  const [showSubscription, setShowSubscription] = useState(false);

  const displayName = user?.user_metadata?.full_name || 'Entregador';
  const email = user?.email || '';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('plan_type')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.plan_type) setPlanType(data.plan_type as 'free' | 'pro');
    })();
  }, [user]);

  const handleSignOut = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <UserCircle size={64} color="#ef4444" />
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <ShieldAlert size={12} color="#ef4444" />
              <Text style={styles.badgeText}>Membro verificado</Text>
            </View>
            {planType === 'pro' && (
              <View style={styles.proBadge}>
                <Crown size={12} color="#fbbf24" />
                <Text style={styles.proBadgeText}>Pro</Text>
              </View>
            )}
          </View>
          {memberSince ? (
            <Text style={styles.memberSince}>Membro desde {memberSince}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={planType === 'pro' ? styles.planCardPro : styles.planCardFree}
            onPress={() => setShowSubscription(true)}
            activeOpacity={0.85}>
            <View style={styles.planCardLeft}>
              {planType === 'pro' ? (
                <Crown size={22} color="#dc2626" />
              ) : (
                <Zap size={22} color="#64748b" />
              )}
              <View style={styles.planCardText}>
                <Text style={planType === 'pro' ? styles.planNamePro : styles.planNameFree}>
                  {planType === 'pro' ? 'Plano Pro' : 'Plano Gratuito'}
                </Text>
                <Text style={styles.planDesc}>
                  {planType === 'pro'
                    ? 'Acesso completo a todos os recursos'
                    : '5 buscas por dia — toque para fazer upgrade'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={planType === 'pro' ? '#dc2626' : '#9ca3af'} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informacoes da conta</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Mail size={18} color="#ef4444" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuracoes</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuRow}>
              <View style={styles.menuIconContainer}>
                <Bell size={18} color="#6b7280" />
              </View>
              <Text style={styles.menuLabel}>Notificacoes</Text>
              <ChevronRight size={16} color="#9ca3af" />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.menuRow}>
              <View style={styles.menuIconContainer}>
                <HelpCircle size={18} color="#6b7280" />
              </View>
              <Text style={styles.menuLabel}>Ajuda e suporte</Text>
              <ChevronRight size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>AntiPNR v1.0.0</Text>
          <Text style={styles.footerSubtext}>Rede de seguranca para entregadores</Text>
        </View>
      </ScrollView>

      <SubscriptionScreen
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
        currentPlan={planType}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#451a03',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#92400e',
  },
  proBadgeText: {
    fontSize: 12,
    color: '#fbbf24',
    fontWeight: '700',
  },
  memberSince: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  planCardPro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardFree: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  planCardText: {
    flex: 1,
  },
  planNamePro: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  planNameFree: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  planDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 64,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#d1d5db',
    marginTop: 2,
  },
});
