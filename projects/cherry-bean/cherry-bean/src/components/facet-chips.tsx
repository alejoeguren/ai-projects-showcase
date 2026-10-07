import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { legendEntries } from '@/lib/facets';
import { FACETS, type CoffeeEntry, type Facet } from '@/lib/types';

export function FacetChips({
  facet,
  onChange,
  coffees,
}: {
  facet: Facet;
  onChange: (f: Facet) => void;
  coffees: CoffeeEntry[];
}) {
  const legend = legendEntries(coffees, facet);
  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {FACETS.map(({ key, label }) => (
          <Pressable key={key} onPress={() => onChange(key)}>
            <ThemedView
              type={facet === key ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.chip}>
              <ThemedText type="smallBold" themeColor={facet === key ? 'text' : 'textSecondary'}>
                {label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ScrollView>
      {legend.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendRow}>
          {legend.map(({ value, color }) => (
            <ThemedView key={value} type="backgroundElement" style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <ThemedText type="small" themeColor="textSecondary">
                {value}
              </ThemedText>
            </ThemedView>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  chipRow: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  legendRow: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    opacity: 0.95,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
