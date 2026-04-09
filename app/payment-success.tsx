import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Crown } from 'lucide-react-native';

export default function PaymentSuccess() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={56} color="#10b981" />
        </View>
        <View style={styles.crownRow}>
          <Crown size={20} color="#dc2626" />
          <Text style={styles.planLabel}>Plano Pro AntiPNR</Text>
        </View>
        <Text style={styles.title}>Pagamento confirmado!</Text>
        <Text style={styles.subtitle}>
          Sua assinatura Pro esta ativa. Agora voce tem acesso ilimitado a todas as funcionalidades.
        </Text>
        <View style={styles.benefitsList}>
          <Text style={styles.benefitItem}>Buscas ilimitadas de enderecos</Text>
          <Text style={styles.benefitItem}>Analisador de Rota ativado</Text>
          <Text style={styles.benefitItem}>Mapa de Risco completo</Text>
          <Text style={styles.benefitItem}>Experiencia sem anuncios</Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}>
          <Text style={styles.buttonText}>Comecar a usar o Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b98140',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#052e16',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 20,
  },
  crownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 280,
  },
  benefitsList: {
    alignSelf: 'stretch',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 28,
  },
  benefitItem: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    paddingLeft: 4,
  },
  button: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
