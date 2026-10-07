import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CoffeeMap from '@/components/coffee-map';
import { FacetChips } from '@/components/facet-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useCoffees } from '@/lib/store';
import { PATTERN_UNLOCK_COUNT, type Facet } from '@/lib/types';

export default function AtlasScreen() {
  const { coffees, ready } = useCoffees();
  const [facet, setFacet] = useState<Facet>('none');
  const logged = coffees.length;

  return (
    <ThemedView style={styles.container}>
      {ready && (
        <CoffeeMap
          coffees={coffees}
          facet={facet}
          onPressCoffee={(id) => router.push(`/coffee/${id}`)}
        />
      )}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="box-none">
          <FacetChips facet={facet} onChange={setFacet} coffees={coffees} />
        </View>
        <View style={styles.bottom} pointerEvents="box-none">
          {logged < PATTERN_UNLOCK_COUNT && (
            <ThemedView type="backgroundElement" style={styles.patternNote}>
              <ThemedText type="small" themeColor="textSecondary">
                Flavor↔geography patterns unlock at {PATTERN_UNLOCK_COUNT} coffees ({logged}/
                {PATTERN_UNLOCK_COUNT})
              </ThemedText>
            </ThemedView>
          )}
          <Link href="/add" asChild>
            <Pressable style={styles.fab}>
              <ThemedText type="subtitle" style={styles.fabText}>
                +
              </ThemedText>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  top: { paddingTop: Spacing.two },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  patternNote: {
    flexShrink: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    opacity: 0.95,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7a4a2b',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#ffffff', lineHeight: 40 },
});
