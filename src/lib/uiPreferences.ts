/** Browser UI preferences (localStorage) — not shareable URL state. */

export const UI_PREFERENCES_STORAGE_KEY = "schoolside.uiPreferences.v1";

export const COMPARE_TABLE_IDS = [
  "ks2",
  "ks4",
  "phonics",
  "early-years-ofsted",
  "eyfsp",
] as const;

export type CompareTableId = (typeof COMPARE_TABLE_IDS)[number];

export type TableStickyPrefs = {
  stickyHeader: boolean;
  stickyFirstColumn: boolean;
};

export type UiPreferences = {
  tables: Record<CompareTableId, TableStickyPrefs>;
};

const DEFAULT_TABLE: TableStickyPrefs = {
  stickyHeader: true,
  stickyFirstColumn: true,
};

export function defaultUiPreferences(): UiPreferences {
  return {
    tables: {
      ks2: { ...DEFAULT_TABLE },
      ks4: { ...DEFAULT_TABLE },
      phonics: { ...DEFAULT_TABLE },
      "early-years-ofsted": { ...DEFAULT_TABLE },
      eyfsp: { ...DEFAULT_TABLE },
    },
  };
}

function isCompareTableId(value: string): value is CompareTableId {
  return (COMPARE_TABLE_IDS as readonly string[]).includes(value);
}

export function normalizeUiPreferences(raw: unknown): UiPreferences {
  const defaults = defaultUiPreferences();
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Partial<UiPreferences>;
  const tables = { ...defaults.tables };
  if (obj.tables && typeof obj.tables === "object") {
    for (const [key, value] of Object.entries(obj.tables)) {
      if (!isCompareTableId(key) || !value || typeof value !== "object") continue;
      tables[key] = {
        stickyHeader:
          typeof value.stickyHeader === "boolean"
            ? value.stickyHeader
            : DEFAULT_TABLE.stickyHeader,
        stickyFirstColumn:
          typeof value.stickyFirstColumn === "boolean"
            ? value.stickyFirstColumn
            : DEFAULT_TABLE.stickyFirstColumn,
      };
    }
  }
  return { tables };
}

export function loadUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return defaultUiPreferences();
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultUiPreferences();
    return normalizeUiPreferences(JSON.parse(raw));
  } catch {
    return defaultUiPreferences();
  }
}

export function saveUiPreferences(prefs: UiPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify(prefs),
    );
  } catch {
    // Private mode / quota — ignore.
  }
}
