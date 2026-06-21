import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MenuListScreen } from '../../src/features/menu/MenuListScreen';
import { C } from '../../src/constants/theme';

export default function LearningMenuTab() {
  return (
    <View style={styles.root}>
      <MenuListScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
});
