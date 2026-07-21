export interface SchoolMetrics {
  rwmExpected?: number | null;
  rwmHigher?: number | null;
  readingExpected?: number | null;
  readingHigher?: number | null;
  readingScaled?: number | null;
  writingExpected?: number | null;
  writingHigher?: number | null;
  mathsExpected?: number | null;
  mathsHigher?: number | null;
  mathsScaled?: number | null;
  gpsExpected?: number | null;
  gpsHigher?: number | null;
  gpsScaled?: number | null;
  scienceExpected?: number | null;
  scienceHigher?: number | null;
  boysRwmExpected?: number | null;
  girlsRwmExpected?: number | null;
  disadvantagedRwmExpected?: number | null;
  notDisadvantagedRwmExpected?: number | null;
}

export interface SchoolRecord extends SchoolMetrics {
  urn: string;
  name: string;
  laEstab?: string;
  locationId?: string;
  localAuthority?: string | null;
  laId?: string | null;
  address?: string | null;
  postcode?: string | null;
  town?: string | null;
  telephone?: string | null;
  ageRange?: string | null;
  phase?: string | null;
  schoolType?: string | null;
  schoolTypeLabel?: string | null;
  religiousDenomination?: string | null;
  closed?: boolean;
  pupilsAged11?: number | null;
  eligiblePupils?: number | null;
  disadvantagedPercent?: number | null;
  disadvantagedCount?: number | null;
  senSupportPercent?: number | null;
  ehcPercent?: number | null;
  ealPercent?: number | null;
  boysPercent?: number | null;
  girlsPercent?: number | null;
  nonMobilePercent?: number | null;
  period?: string;
  compareUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DirectorySchool {
  urn: string;
  name: string;
  localAuthority?: string | null;
  town?: string | null;
  postcode?: string | null;
  ageRange?: string | null;
  phase?: string | null;
  schoolTypeLabel?: string | null;
  rwmExpected?: number | null;
  eligiblePupils?: number | null;
}

export interface BenchmarkSet extends SchoolMetrics {}

export interface SchoolsIndex {
  generatedAt: string;
  period: string;
  source: {
    api: string;
    datasets: Record<string, string>;
    primarySite: string;
    note: string;
  };
  benchmarks: {
    england: BenchmarkSet;
    localAuthorities: Record<string, BenchmarkSet>;
  };
  schools: SchoolRecord[];
  stats: {
    schoolCount: number;
    withRwm: number;
    localAuthorityCount: number;
    withCoordinates?: number;
  };
}

export interface SchoolsDirectory {
  generatedAt: string;
  period: string;
  schools: DirectorySchool[];
}

export type MetricKey =
  | "rwmExpected"
  | "rwmHigher"
  | "readingExpected"
  | "writingExpected"
  | "mathsExpected"
  | "gpsExpected"
  | "scienceExpected"
  | "readingScaled"
  | "mathsScaled"
  | "disadvantagedPercent"
  | "eligiblePupils"
  | "boysRwmExpected"
  | "girlsRwmExpected"
  | "disadvantagedRwmExpected";
