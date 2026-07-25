/** Early-years directory kinds (nurseries / day care vs childminders). */

export const EY_SETTING_OPTIONS = [
  {
    id: "nurseries",
    label: "Nurseries",
    hint: "Hampshire Ofsted day-care nurseries (full and sessional)",
  },
  {
    id: "childminders",
    label: "Childminders",
    hint: "Hampshire childminders who consented to publish an address",
  },
] as const;

export type EySettingId = (typeof EY_SETTING_OPTIONS)[number]["id"];

export const DEFAULT_EY_SETTINGS: EySettingId[] = [
  "nurseries",
  "childminders",
];

const EY_SETTING_IDS = new Set<string>(EY_SETTING_OPTIONS.map((o) => o.id));

export function normalizeEySettingIds(raw: string[]): EySettingId[] {
  const out: EySettingId[] = [];
  for (const token of raw) {
    const id = token.trim().toLowerCase();
    const alias =
      id === "nursery" || id === "daycare" || id === "day-care"
        ? "nurseries"
        : id === "childminder" || id === "cm"
          ? "childminders"
          : id;
    if (EY_SETTING_IDS.has(alias) && !out.includes(alias as EySettingId)) {
      out.push(alias as EySettingId);
    }
  }
  return out;
}

/** Parse URL / query tokens; empty or invalid → defaults (both on). */
export function parseEySettingsParam(raw: string | null | undefined): EySettingId[] {
  if (raw == null || !String(raw).trim()) return [...DEFAULT_EY_SETTINGS];
  const parsed = normalizeEySettingIds(String(raw).split(","));
  return parsed.length ? parsed : [...DEFAULT_EY_SETTINGS];
}

export function wantsNurseries(settings: EySettingId[]): boolean {
  return settings.includes("nurseries");
}

export function wantsChildminders(settings: EySettingId[]): boolean {
  return settings.includes("childminders");
}

/**
 * Toggle one EY setting. Keeps at least one selected so Early years stays useful.
 */
export function toggleEySetting(
  selected: EySettingId[],
  id: EySettingId,
): EySettingId[] {
  if (selected.includes(id)) {
    if (selected.length === 1) return selected;
    return selected.filter((s) => s !== id);
  }
  return [...selected, id];
}
