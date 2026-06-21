import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { queryClient } from '../src/lib/queryClient';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { StyleSheet } from 'react-native';
import { C, FONT } from '../src/constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [FONT.regular]:   Inter_400Regular,
    [FONT.medium]:    Inter_500Medium,
    [FONT.semiBold]:  Inter_600SemiBold,
    [FONT.bold]:      Inter_700Bold,
    [FONT.extraBold]: Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: C.surface },
                headerTintColor: C.text,
                headerTitleStyle: { fontFamily: FONT.bold, fontSize: 17 },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: C.bg },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="menu/[itemId]"
                options={{ title: 'Menu Item', headerBackTitle: 'Menu' }}
              />
              <Stack.Screen
                name="quiz/results"
                options={{ title: 'Results', headerBackTitle: 'Quiz' }}
              />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
});
