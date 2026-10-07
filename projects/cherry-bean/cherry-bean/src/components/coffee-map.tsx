/**
 * Native map (react-native-maps: Apple Maps on iOS, Google Maps on Android —
 * both work inside Expo Go with no token). Isolated behind this component so
 * the planned swap to Mapbox at dev-build time touches only this file and
 * coffee-map.web.tsx.
 */
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { facetColor, facetValue } from '@/lib/facets';
import type { CoffeeEntry, Facet } from '@/lib/types';

export interface CoffeeMapProps {
  coffees: CoffeeEntry[];
  facet: Facet;
  onPressCoffee: (id: string) => void;
}

export default function CoffeeMap({ coffees, facet, onPressCoffee }: CoffeeMapProps) {
  const plotted = coffees.filter((c) => c.originPin);
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: 8,
        longitude: -20,
        latitudeDelta: 90,
        longitudeDelta: 140,
      }}>
      {plotted.map((c) => (
        <Marker
          key={c.id}
          coordinate={{ latitude: c.originPin!.lat, longitude: c.originPin!.lon }}
          title={c.coffeeName}
          description={`${c.roaster} · ${c.regionString ?? c.country ?? ''}`}
          onCalloutPress={() => onPressCoffee(c.id)}>
          <View style={[styles.originDot, { backgroundColor: facetColor(facet, facetValue(c, facet)) }]} />
        </Marker>
      ))}
      {coffees
        .filter((c) => c.roasterPin)
        .map((c) => (
          <Marker
            key={`roaster-${c.id}`}
            coordinate={{ latitude: c.roasterPin!.lat, longitude: c.roasterPin!.lon }}
            title={c.roaster}
            description="Roaster"
            onCalloutPress={() => onPressCoffee(c.id)}>
            <View style={styles.roasterSquare} />
          </Marker>
        ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  originDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  roasterSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#3d3d3d',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
