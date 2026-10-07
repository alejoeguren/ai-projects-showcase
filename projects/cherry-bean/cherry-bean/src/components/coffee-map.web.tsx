/**
 * Web fallback — react-native-maps has no web support. The real map lives on
 * the phone (Expo Go); this keeps the web preview useful for everything else.
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { facetColor, facetValue } from '@/lib/facets';
import type { CoffeeMapProps } from './coffee-map';

export default function CoffeeMap({ coffees, facet, onPressCoffee }: CoffeeMapProps) {
  const plotted = coffees.filter((c) => c.originPin);
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">🗺️ Atlas</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        The interactive map renders on your phone — open this project in Expo Go. Pins currently
        plotted:
      </ThemedText>
      <ScrollView style={styles.list} contentContainerStyle={{ gap: Spacing.two }}>
        {plotted.map((c) => (
          <ThemedView
            key={c.id}
            type="backgroundElement"
            style={styles.row}
            onTouchEnd={() => onPressCoffee(c.id)}>
            <View
              style={[styles.dot, { backgroundColor: facetColor(facet, facetValue(c, facet)) }]}
            />
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{c.coffeeName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {c.originPin!.tier} · {c.originPin!.lat.toFixed(3)}, {c.originPin!.lon.toFixed(3)} ·{' '}
                {c.regionString ?? c.country}
              </ThemedText>
            </View>
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  note: { maxWidth: 480 },
  list: { flex: 1, marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    maxWidth: 640,
  },
  rowText: { flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
