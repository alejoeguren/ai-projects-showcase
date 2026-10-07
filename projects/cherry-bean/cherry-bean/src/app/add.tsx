/**
 * Confirm-and-correct entry form (PRD: the user reviews and edits before
 * saving — no silent auto-write). Manual entry for now; the camera scan flow
 * will pre-fill these same fields, so what the user sees here is exactly
 * what persists.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { geocodePlace, resolvePin } from '@/lib/geocode';
import { newId, useCoffees } from '@/lib/store';
import type { CoffeeEntry, OriginPin } from '@/lib/types';

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
      />
    </View>
  );
}

const nullable = (s: string) => (s.trim() ? s.trim() : null);

export default function AddScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { coffees, add, update } = useCoffees();
  const editing = id ? coffees.find((c) => c.id === id) : undefined;

  const [roaster, setRoaster] = useState(editing?.roaster ?? '');
  const [roasterLocation, setRoasterLocation] = useState(editing?.roasterLocation ?? '');
  const [coffeeName, setCoffeeName] = useState(editing?.coffeeName ?? '');
  const [country, setCountry] = useState(editing?.country ?? '');
  const [regionString, setRegionString] = useState(editing?.regionString ?? '');
  const [producerOrFarm, setProducerOrFarm] = useState(editing?.producerOrFarm ?? '');
  const [elevation, setElevation] = useState(editing?.elevation ?? '');
  const [variety, setVariety] = useState(editing?.variety ?? '');
  const [process, setProcess] = useState(editing?.process ?? '');
  const [tastingNotes, setTastingNotes] = useState(editing?.tastingNotes ?? '');

  const [pin, setPin] = useState<OriginPin | null>(editing?.originPin ?? null);
  const [pinChecked, setPinChecked] = useState(Boolean(editing));
  const [busy, setBusy] = useState<'locate' | 'save' | null>(null);

  const geoFields = () => ({
    country: nullable(country),
    regionString: nullable(regionString),
    producerOrFarm: nullable(producerOrFarm),
  });

  const locate = async () => {
    setBusy('locate');
    try {
      const resolved = await resolvePin(geoFields());
      setPin(resolved);
      setPinChecked(true);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!coffeeName.trim() && !roaster.trim()) return;
    setBusy('save');
    try {
      let finalPin = pin;
      if (!pinChecked && nullable(country)) {
        finalPin = await resolvePin(geoFields());
      }
      const roasterLoc = nullable(roasterLocation);
      const roasterPin =
        roasterLoc && roasterLoc !== editing?.roasterLocation
          ? await geocodePlace(roasterLoc)
          : (editing?.roasterPin ?? null);

      const entry: CoffeeEntry = {
        id: editing?.id ?? newId(),
        createdAt: editing?.createdAt ?? new Date().toISOString(),
        source: editing?.source ?? 'private',
        roaster: roaster.trim(),
        roasterLocation: roasterLoc,
        roasterPin,
        coffeeName: coffeeName.trim() || `${roaster.trim()} coffee`,
        country: nullable(country),
        regionString: nullable(regionString),
        producerOrFarm: nullable(producerOrFarm),
        elevation: nullable(elevation),
        variety: nullable(variety),
        process: nullable(process),
        tastingNotes: nullable(tastingNotes),
        originPin: finalPin,
      };
      if (editing) {
        update(editing.id, entry);
      } else {
        add(entry);
      }
      router.back();
    } finally {
      setBusy(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form}>
          <Field label="Coffee name" value={coffeeName} onChange={setCoffeeName} placeholder="e.g. Shoondisa" />
          <Field label="Roaster" value={roaster} onChange={setRoaster} placeholder="e.g. The Boy & The Bear" />
          <Field label="Roaster location" value={roasterLocation} onChange={setRoasterLocation} placeholder="e.g. Los Angeles, USA" />
          <Field label="Origin country" value={country} onChange={setCountry} placeholder="e.g. Ethiopia" />
          <Field label="Region (as printed)" value={regionString} onChange={setRegionString} placeholder="e.g. Guji" />
          <Field label="Farm / producer" value={producerOrFarm} onChange={setProducerOrFarm} placeholder="e.g. Sookoo Coffee" />
          <Field label="Elevation (as printed)" value={elevation} onChange={setElevation} placeholder="e.g. 1900-2100 masl" />
          <Field label="Variety" value={variety} onChange={setVariety} placeholder="e.g. Heirloom" />
          <Field label="Process" value={process} onChange={setProcess} placeholder="e.g. Washed" />
          <Field label="Tasting notes" value={tastingNotes} onChange={setTastingNotes} placeholder="e.g. bergamot, pear" />

          <ThemedView type="backgroundElement" style={styles.pinBox}>
            {busy === 'locate' ? (
              <View style={styles.pinRow}>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary">
                  Checking the atlas…
                </ThemedText>
              </View>
            ) : pinChecked ? (
              pin ? (
                <ThemedText type="small">
                  📍 {pin.tier} pin — {pin.matched}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Couldn’t place this origin — it will be saved unplotted. Add or correct the
                  country/region and try again.
                </ThemedText>
              )
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                The pin resolves from the printed region when you save (or preview it now).
              </ThemedText>
            )}
            <Pressable onPress={locate} disabled={busy !== null}>
              <ThemedView type="backgroundSelected" style={styles.smallButton}>
                <ThemedText type="smallBold">Preview pin</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>

          <Pressable onPress={save} disabled={busy !== null || (!coffeeName.trim() && !roaster.trim())}>
            <View style={[styles.saveButton, busy !== null && { opacity: 0.6 }]}>
              {busy === 'save' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText type="smallBold" style={styles.saveText}>
                  {editing ? 'Save changes' : 'Add to my atlas'}
                </ThemedText>
              )}
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  pinBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  saveButton: {
    backgroundColor: '#7a4a2b',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveText: { color: '#ffffff' },
});
