import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/features/auth/AuthContext';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { LocationHeaderButton } from '../../src/contexts/LocationContext';
import { C, FONT } from '../../src/constants/theme';

export default function TabsLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) return <LoadingState message="Loading…" />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
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
          headerRight: () => <LocationHeaderButton />,
        }}
      >
        <Tabs.Screen
          name="quiz"
          options={{
            title: 'Quiz',
            tabBarLabel: 'Quiz',
            tabBarIcon: ({ color }) => <TabIcon label="◈" color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="learning-menu"
          options={{
            title: 'Menu',
            tabBarLabel: 'Menu',
            tabBarIcon: ({ color }) => <TabIcon label="≡" color={color as string} />,
          }}
        />
      </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string | undefined }) {
  const { Text } = require('react-native') as typeof import('react-native');
  return <Text style={{ color, fontSize: 20 }}>{label}</Text>;
}
