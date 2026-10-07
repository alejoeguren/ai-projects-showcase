import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCoffees } from '@/lib/store';

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function CoffeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { coffees, remove } = useCoffees();
  const coffee = coffees.find((c) => c.id === id);

  if (!coffee) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText themeColor="textSecondary" style={{ padding: Spacing.four }}>
          This coffee is no longer in your history.
        </ThemedText>
      </ThemedView>
    );
  }

  const confirmDelete = () => {
    const doRemove = () => {
      remove(coffee.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(`Delete "${coffee.coffeeName}" from your history?`)) doRemove();
      return;
    }
    Alert.alert('Delete coffee', `Delete "${coffee.coffeeName}" from your history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: coffee.coffeeName }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{coffee.coffeeName}</ThemedText>
        <ThemedText themeColor="textSecondary">{coffee.roaster}</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          {coffee.originPin ? (
            <>
              <ThemedText type="smallBold">📍 {coffee.originPin.tier} precision</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {coffee.originPin.matched}
              </ThemedText>
              <ThemedText type="code" themeColor="textSecondary">
                {coffee.originPin.lat.toFixed(4)}, {coffee.originPin.lon.toFixed(4)}
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Not plotted — no origin could be resolved for this coffee. Edit it to add a country
              or region.
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <Row label="Country" value={coffee.country} />
          <Row label="Region" value={coffee.regionString} />
          <Row label="Farm / producer" value={coffee.producerOrFarm} />
          <Row label="Elevation" value={coffee.elevation} />
          <Row label="Variety" value={coffee.variety} />
          <Row label="Process" value={coffee.process} />
          <Row label="Notes" value={coffee.tastingNotes} />
          <Row label="Roaster location" value={coffee.roasterLocation} />
          <Row label="Logged" value={new Date(coffee.createdAt).toLocaleDateString()} />
          <Row label="Data tier" value={coffee.source} />
        </ThemedView>

        <View style={styles.actions}>
          <Pressable onPress={() => router.push(`/add?id=${coffee.id}`)}>
            <ThemedView type="backgroundSelected" style={styles.button}>
              <ThemedText type="smallBold">Edit</ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable onPress={confirmDelete}>
            <View style={[styles.button, styles.deleteButton]}>
              <ThemedText type="smallBold" style={styles.deleteText}>
                Delete
              </ThemedText>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  rowLabel: { width: 120 },
  rowValue: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  deleteButton: { backgroundColor: '#b3261e' },
  deleteText: { color: '#ffffff' },
});
