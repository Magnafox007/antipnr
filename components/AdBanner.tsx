import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, Tag } from 'lucide-react-native';

interface Ad {
  id: string;
  label: string;
  title: string;
  description: string;
  cta: string;
  url: string;
  accentColor: string;
}

const ADS: Ad[] = [
  {
    id: '1',
    label: 'Equipamentos',
    title: 'Bolsa Termica Pro para Entregadores',
    description: 'Mantenha pedidos quentes por mais tempo. Frete gratis para todo o Brasil.',
    cta: 'Ver Oferta',
    url: 'https://www.mercadolivre.com.br/bolsa-termica-mochila-entregador',
    accentColor: '#0ea5e9',
  },
  {
    id: '2',
    label: 'Seguranca',
    title: 'Rastreador Veicular com App Gratis',
    description: 'Monitore sua moto ou carro em tempo real. Sem mensalidade no primeiro mes.',
    cta: 'Saiba Mais',
    url: 'https://www.mercadolivre.com.br/rastreador-veicular',
    accentColor: '#16a34a',
  },
  {
    id: '3',
    label: 'Financeiro',
    title: 'Conta Digital sem Tarifas para MEI',
    description: 'Abra sua conta MEI em minutos. Sem taxa de manutencao e cartao gratis.',
    cta: 'Abrir Conta',
    url: 'https://www.mercadopago.com.br/conta',
    accentColor: '#d97706',
  },
  {
    id: '4',
    label: 'Seguro',
    title: 'Seguro para Entregadores a partir de R$ 19',
    description: 'Proteja sua moto e sua renda. Cobertura para acidentes e roubo.',
    cta: 'Cotar Agora',
    url: 'https://www.tokio-marine.com.br/seguro-moto',
    accentColor: '#dc2626',
  },
  {
    id: '5',
    label: 'Manutencao',
    title: 'Pecas e Acessorios com ate 40% off',
    description: 'Filtros, pneus e lubrificantes entregues na sua porta. Parcelamento em 12x.',
    cta: 'Ver Catalogo',
    url: 'https://www.mercadolivre.com.br/pecas-moto',
    accentColor: '#7c3aed',
  },
];

interface AdBannerProps {
  userPlan: 'free' | 'pro';
}

export default function AdBanner({ userPlan }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ADS.length);
    }, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (userPlan === 'pro' || dismissed) return null;

  const ad = ADS[currentIndex];

  const handlePress = () => {
    Linking.openURL(ad.url).catch(() => {});
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.accentBar, { backgroundColor: ad.accentColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.labelBadge, { backgroundColor: ad.accentColor + '18' }]}>
            <Tag size={10} color={ad.accentColor} />
            <Text style={[styles.labelText, { color: ad.accentColor }]}>{ad.label}</Text>
          </View>
          <View style={styles.topRowRight}>
            <Text style={styles.sponsoredText}>Patrocinado</Text>
            <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>{ad.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{ad.description}</Text>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: ad.accentColor }]}
            onPress={handlePress}
            activeOpacity={0.85}>
            <Text style={styles.ctaText}>{ad.cta}</Text>
            <ExternalLink size={13} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.dots}>
            {ADS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex && { backgroundColor: ad.accentColor, width: 16 },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sponsoredText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
});
