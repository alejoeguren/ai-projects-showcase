import { Link, router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useCoffees } from '@/lib/store';
import type { CoffeeEntry } from '@/lib/types';

const TIER_LABEL: Record<string, string> = {
  farm: '📍 farm',
  subregion: '📍 subregion',
  country: '📍 country',
};

function Row({ coffee }: { coffee: CoffeeEntry }) {
  return (
    <Pressable onPress={() => router.push(`/coffee/${coffee.id}`)}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.rowHeader}>
          <ThemedText type="smallBold" style={styles.rowTitle} numberOfLines={1}>
            {coffee.coffeeName}
          </ThemedText>
          <ThemedText type="code" themeColor="textSecondary">
            {coffee.originPin ? TIER_LABEL[coffee.originPin.tier] : 'unplotted'}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {coffee.roaster}
          {coffee.regionString ? ` · ${coffee.regionString}` : ''}
          {coffee.country ? `, ${coffee.country}` : ''}
        </ThemedText>
        {coffee.tastingNotes && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {coffee.tastingNotes}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { coffees } = useCoffees();
  const sorted = [...coffees].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="subtitle">History</ThemedText>
          <Link href="/add" asChild>
            <Pressable>
              <ThemedView type="backgroundSelected" style={styles.addButton}>
                <ThemedText type="smallBold">+ Log coffee</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        </View>
        <FlatList
          data={sorted}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <Row coffee={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">No coffees yet — log your first!</ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  addButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  list: { gap: Spacing.two, paddingBottom: BottomTabInset + Spacing.three },
  row: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowTitle: { flexShrink: 1 },
});
