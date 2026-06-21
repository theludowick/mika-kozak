import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMenuItems } from '../../src/services/menuService';
import { useSelectedLocation } from '../../src/hooks/useSelectedLocation';
import { MenuItemDetailScreen } from '../../src/features/menu/MenuItemDetailScreen';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { C, FONT } from '../../src/constants/theme';

export default function MenuItemPage() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { data: items, isLoading, isError, error, refetch } = useMenuItems();
  const { location } = useSelectedLocation();

  if (isLoading) return <LoadingState message="Loading…" />;
  if (isError)
    return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const item = items?.find((i) => i.id === itemId);

  if (!item) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={styles.notFound}>Menu item not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: item.name }} />
      <MenuItemDetailScreen item={item} selectedLocation={location} allItems={items ?? []} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  notFound: {
    color: C.textSub,
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
    fontFamily: FONT.regular,
    fontStyle: 'italic',
  },
});
