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

export interface IndependentMetrics {
  att8Average?: number | null;
  engMath94Percent?: number | null;
  engMath95Percent?: number | null;
  engMathEnteringPercent?: number | null;
  engMathMeasureUnavailable?: boolean | null;
  engMath94IsPillarFallback?: boolean | null;
  anyPassPercent?: number | null;
  ebaccEnteringPercent?: number | null;
  ebacc94Percent?: number | null;
  ebaccAps?: number | null;
  ebaccEng94Percent?: number | null;
  ebaccMat94Percent?: number | null;
  ebaccSci94Percent?: number | null;
  ebaccEngEnteringPercent?: number | null;
  ebaccMatEnteringPercent?: number | null;
  ks4Pupils?: number | null;
  ks4Period?: string | null;
  ks4ClearedNilFields?: string[] | null;
  ofstedOverall?: string | null;
  ofstedOverallCode?: string | null;
  ofstedQualityOfEducation?: string | null;
  ofstedLeadership?: string | null;
  ofstedSafeguardingEffective?: string | null;
  ofstedIssCompliance?: string | null;
  ofstedInspectorate?: string | null;
  ofstedInspectionDate?: string | null;
  ofstedPublicationDate?: string | null;
  ofstedReportUrl?: string | null;
  ofstedPupilsOnRoll?: number | null;
  schoolWebsite?: string | null;
  inspectorateName?: string | null;
  isiReportsUrl?: string | null;
  inspectionReportsUrl?: string | null;
}

export interface SchoolRecord extends SchoolMetrics, IndependentMetrics {
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
  phases?: Array<"early-years" | "ks1" | "ks2" | "ks3" | "ks4"> | null;
  schoolType?: string | null;
  schoolTypeLabel?: string | null;
  sector?: "state" | "independent" | null;
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
  source?: string | null;
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
  sector?: "state" | "independent" | null;
  rwmExpected?: number | null;
  eligiblePupils?: number | null;
  att8Average?: number | null;
  ofstedOverall?: string | null;
}

export interface BenchmarkSet extends SchoolMetrics {}

export interface IndependentBenchmarkSet extends IndependentMetrics {
  period?: string | null;
  schoolCount?: number | null;
  note?: string | null;
}

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
    independent?: IndependentBenchmarkSet;
  };
  schools: SchoolRecord[];
  stats: {
    schoolCount: number;
    withRwm: number;
    localAuthorityCount: number;
    withCoordinates?: number;
    giasEnriched?: boolean;
    infantOrNurseryCount?: number;
    stateCount?: number;
    independentCount?: number;
    independentWithKs4?: number;
    independentWithOfsted?: number;
    independentEnriched?: boolean;
    ks4Period?: string;
    ofstedAsAt?: string;
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
