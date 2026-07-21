import type { DirectorySchool, SchoolRecord } from "@/lib/types";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Score a school against a free-text parental search (name, town, postcode, URN, LA). */
export function scoreSchool(
  school: DirectorySchool | SchoolRecord,
  query: string,
): number {
  const q = norm(query);
  if (!q) return 0;
  const urn = school.urn || "";
  if (urn === query.trim()) return 1000;
  if (urn.startsWith(query.trim())) return 900;

  const name = norm(school.name || "");
  const town = norm(school.town || "");
  const postcode = norm(school.postcode || "");
  const la = norm(school.localAuthority || "");
  const hay = `${name} ${town} ${postcode} ${la} ${urn}`;

  if (name === q) return 800;
  if (name.startsWith(q)) return 700;
  if (postcode.replace(/\s/g, "") === q.replace(/\s/g, "")) return 750;
  if (postcode.startsWith(q) || postcode.replace(/\s/g, "").startsWith(q.replace(/\s/g, ""))) {
    return 650;
  }

  const tokens = q.split(" ").filter(Boolean);
  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 40;
    if (town.includes(token)) score += 30;
    if (la.includes(token)) score += 20;
    if (postcode.includes(token)) score += 35;
    if (urn.includes(token)) score += 50;
  }
  if (hay.includes(q)) score += 25;
  return score;
}

export function searchSchools<T extends DirectorySchool | SchoolRecord>(
  schools: T[],
  query: string,
  limit = 12,
): T[] {
  const q = query.trim();
  if (!q) return [];
  return schools
    .map((school) => ({ school, score: scoreSchool(school, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name))
    .slice(0, limit)
    .map((row) => row.school);
}
