import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { SEED_COFFEES } from './seed';
import type { CoffeeEntry } from './types';

const STORAGE_KEY = 'cherry-bean/coffees/v1';

interface CoffeesApi {
  coffees: CoffeeEntry[];
  ready: boolean;
  add: (entry: CoffeeEntry) => void;
  update: (id: string, patch: Partial<CoffeeEntry>) => void;
  remove: (id: string) => void;
}

const CoffeesContext = createContext<CoffeesApi | null>(null);

export function CoffeesProvider({ children }: { children: React.ReactNode }) {
  const [coffees, setCoffees] = useState<CoffeeEntry[]>([]);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setCoffees(raw ? (JSON.parse(raw) as CoffeeEntry[]) : SEED_COFFEES);
      } catch {
        setCoffees(SEED_COFFEES);
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coffees)).catch(() => {
      // Persistence failure shouldn't crash the UI; entry stays in memory.
    });
  }, [coffees]);

  const add = useCallback((entry: CoffeeEntry) => {
    setCoffees((prev) => [entry, ...prev]);
  }, []);

  const update = useCallback((id: string, patch: Partial<CoffeeEntry>) => {
    setCoffees((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const remove = useCallback((id: string) => {
    setCoffees((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const api = useMemo(
    () => ({ coffees, ready, add, update, remove }),
    [coffees, ready, add, update, remove],
  );

  return <CoffeesContext.Provider value={api}>{children}</CoffeesContext.Provider>;
}

export function useCoffees(): CoffeesApi {
  const ctx = useContext(CoffeesContext);
  if (!ctx) throw new Error('useCoffees must be used within CoffeesProvider');
  return ctx;
}

export function newId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
