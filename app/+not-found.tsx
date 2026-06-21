import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { C, FONT } from '../src/constants/theme';

export default function NotFound() {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Text style={styles.title}>Page not found</Text>
      <Link href="/(tabs)/quiz" style={styles.link}>
        <Text style={styles.linkText}>Go to Quiz</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: C.textSub, fontSize: 18, fontFamily: FONT.semiBold, marginBottom: 16 },
  link: {},
  linkText: { color: C.primary, fontSize: 15, fontFamily: FONT.medium },
});
