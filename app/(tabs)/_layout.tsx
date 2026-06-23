import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/features/auth/AuthContext';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { LocationHeaderButton } from '../../src/contexts/LocationContext';
import { ProfileScreen } from '../../src/features/profile/ProfileScreen';
import { useUnresolvedIssueCount } from '../../src/services/reportedIssuesService';
import { C, FONT } from '../../src/constants/theme';

function ProfileButton({ onPress, initials, hasUnresolved }: { onPress: () => void; initials: string; hasUnresolved: boolean }) {
  return (
    <TouchableOpacity style={styles.profileBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel="Profile">
      <Text style={styles.profileBtnText}>{initials}</Text>
      {hasUnresolved && <View style={styles.redDot} />}
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { session, isLoading, fullName, user, isAdmin } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const { data: unresolvedCount = 0 } = useUnresolvedIssueCount({ enabled: isAdmin });

  if (isLoading) return <LoadingState message="Loading…" />;
  if (!session) return <Redirect href="/(auth)/login" />;

  const initials = fullName
    ? fullName.trim().split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.textMuted,
          tabBarLabelStyle: { fontFamily: FONT.semiBold, fontSize: 11 },
          headerStyle: { backgroundColor: C.surface },
          headerTintColor: C.text,
          headerTitleStyle: { fontFamily: FONT.bold, fontSize: 17 },
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: C.bg },
          headerRight: () => (
            <View style={styles.headerRight}>
              <LocationHeaderButton />
              <ProfileButton initials={initials} onPress={() => setShowProfile(true)} hasUnresolved={isAdmin && unresolvedCount > 0} />
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="learning-menu"
          options={{
            title: 'Learning Menu',
            tabBarLabel: 'Learning Menu',
            tabBarIcon: ({ color }) => <TabIcon label="≡" color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="quiz"
          options={{
            title: 'Quiz',
            tabBarLabel: 'Quiz',
            tabBarIcon: ({ color }) => <TabIcon label="◈" color={color as string} />,
          }}
        />
      </Tabs>

      <ProfileScreen visible={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}

function TabIcon({ label, color }: { label: string; color: string | undefined }) {
  const { Text: RNText } = require('react-native') as typeof import('react-native');
  return <RNText style={{ color, fontSize: 20 }}>{label}</RNText>;
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primaryMuted,
    borderWidth: 1.5,
    borderColor: C.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: C.primary,
  },
  redDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.error,
    borderWidth: 1.5,
    borderColor: C.surface,
  },
});
