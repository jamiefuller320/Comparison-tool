"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultUiPreferences,
  loadUiPreferences,
  saveUiPreferences,
  type CompareTableId,
  type TableStickyPrefs,
  type UiPreferences,
} from "@/lib/uiPreferences";

type UiPreferencesContextValue = {
  prefs: UiPreferences;
  hydrated: boolean;
  setTableSticky: (
    tableId: CompareTableId,
    patch: Partial<TableStickyPrefs>,
  ) => void;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(
  null,
);

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UiPreferences>(defaultUiPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadUiPreferences());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveUiPreferences(prefs);
  }, [prefs, hydrated]);

  const setTableSticky = useCallback(
    (tableId: CompareTableId, patch: Partial<TableStickyPrefs>) => {
      setPrefs((prev) => ({
        ...prev,
        tables: {
          ...prev.tables,
          [tableId]: {
            ...prev.tables[tableId],
            ...patch,
          },
        },
      }));
    },
    [],
  );

  const value = useMemo(
    () => ({
      prefs,
      hydrated,
      setTableSticky,
    }),
    [prefs, hydrated, setTableSticky],
  );

  return (
    <UiPreferencesContext.Provider value={value}>
      {children}
    </UiPreferencesContext.Provider>
  );
}

export function useUiPreferences(): UiPreferencesContextValue {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider");
  }
  return ctx;
}
