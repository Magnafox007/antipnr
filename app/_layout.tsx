import { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

function AuthGate() {
  const { session, user, loading } = useAuth();
  const segments = useSegments();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login';
    const inRegister = segments[0] === 'register';
    const inAdminSecret = segments[0] === 'admin-secret';

    if (!session && inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (inAdminSecret && !session) {
      router.replace('/login');
      return;
    }

    if (session && user && (inLogin || inRegister) && !hasRedirected.current) {
      hasRedirected.current = true;
      (async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = profile?.role ?? 'user';
        if (role === 'master_admin' || role === 'admin') {
          router.replace('/admin-secret');
        } else {
          router.replace('/(tabs)');
        }
        hasRedirected.current = false;
      })();
    }
  }, [session, user, loading, segments]);

  return (
    <View style={styles.root}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="admin-secret" />
        <Stack.Screen name="payment-success" />
        <Stack.Screen name="payment-cancel" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
