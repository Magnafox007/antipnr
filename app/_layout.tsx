import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login';
    const inRegister = segments[0] === 'register';
    const inAdminSecret = segments[0] === 'admin-secret';

    if (inAdminSecret) return;

    if (!session && inAuthGroup) {
      router.replace('/login');
    } else if (session && (inLogin || inRegister)) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

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
