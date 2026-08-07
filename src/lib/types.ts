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
  /** 16–18 / KS5 (A level) outcomes where published. */
  ks5ApsPerEntry?: number | null;
  ks5Best3Aps?: number | null;
  ks5Students?: number | null;
  ks5AlevelStudents?: number | null;
  ks5ValueAdded?: number | null;
  ks5Period?: string | null;
  ks5Cohort?: string | null;
  ks5ClearedNilFields?: string[] | null;
  ofstedOverall?: string | null;
  ofstedOverallCode?: string | null;
  ofstedQualityOfEducation?: string | null;
  ofstedBehaviourAndAttitudes?: string | null;
  ofstedPersonalDevelopment?: string | null;
  ofstedLeadership?: string | null;
  /** State-school OEIF early years provision grade (where published). */
  ofstedEarlyYearsProvision?: string | null;
  ofstedSafeguardingEffective?: string | null;
  ofstedIssCompliance?: string | null;
  ofstedInspectorate?: string | null;
  ofstedInspectionDate?: string | null;
  ofstedPublicationDate?: string | null;
  ofstedReportUrl?: string | null;
  ofstedPupilsOnRoll?: number | null;
  /**
   * e.g. ofsted-childcare, ofsted-state-schools, ofsted-independent,
   * ofsted-consented-childminder
   */
  ofstedSource?: string | null;
  /** Ofsted childcare provider URN (when source is ofsted-childcare). */
  ofstedUrn?: string | null;
  /** True when listed from Ofsted’s consented-addresses publication. */
  consentedAddress?: boolean | null;
  providerType?: string | null;
  providerSubtype?: string | null;
  places?: number | null;
  placesIncludingEstimates?: number | null;
  schoolWebsite?: string | null;
  inspectorateName?: string | null;
  isiReportsUrl?: string | null;
  /** Stable ISI institution profile when resolved. */
  isiProfileUrl?: string | null;
  /** Direct PDF / DownloadReport link for the newest listed ISI report. */
  isiLatestReportUrl?: string | null;
  /** ISO date (YYYY-MM-DD) parsed from the ISI report filename. */
  isiLatestReportDate?: string | null;
  /** Short label such as "Routine inspection". */
  isiLatestReportTitle?: string | null;
  inspectionReportsUrl?: string | null;
  giasUrl?: string | null;
  /**
   * Verbatim excerpt from the latest Ofsted/ISI report PDF (not paraphrased).
   * Always accompanied by inspectionReportFileUrl for footnote verification.
   */
  inspectionPrecis?: string | null;
  /** Short verbatim quotes with footnote URLs back to the source PDF. */
  inspectionQuotes?: InspectionQuote[] | null;
  /** Verbatim positives / what the setting does well. */
  inspectionStrengths?: InspectionQuote[] | null;
  /** Verbatim areas for improvement / next steps. */
  inspectionImprovements?: InspectionQuote[] | null;
  /** Direct PDF (or DownloadReport) URL used for the précis / quotes. */
  inspectionReportFileUrl?: string | null;
  /** Parent-facing label, e.g. "School inspection · 7 June 2023". */
  inspectionReportLabel?: string | null;
  inspectionPrecisSource?: "ofsted" | "isi" | null;
  /** ISO date the précis fields were last enriched. */
  inspectionPrecisEnrichedAt?: string | null;
}

/** Footnoted quote excerpted from an inspection report PDF. */
export interface InspectionQuote {
  text: string;
  section?: string | null;
  sourceUrl: string;
}

export type ContactRole =
  | "headteacher"
  | "senco"
  | "office"
  | "admissions"
  | "safeguarding"
  | "governor"
  | "other";

export type ContactSourceType =
  | "gias"
  | "dfe-index"
  | "school-website"
  | "school-document"
  | "other";

export interface ContactEntry {
  role: ContactRole;
  sourceType: ContactSourceType;
  sourceUrl: string;
  capturedAt: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  town?: string | null;
  postcode?: string | null;
  label?: string | null;
}

export interface ContactCaptureRecord {
  urn: string;
  name: string;
  assessedAt: string;
  engineVersion: string;
  contacts: ContactEntry[];
  captureNotes?: string[];
}

export type QualitativeSourceType =
  | "school-website"
  | "school-document"
  | "local-news"
  | "social-media"
  | "other";

export type QualitativeSubjectArea =
  | "curriculum"
  | "enrichment"
  | "ethos"
  | "behaviour"
  | "send"
  | "community";

export interface QualitativeSignal {
  text: string;
  sourceUrl: string;
  sourceType: QualitativeSourceType;
  capturedAt: string;
  pageTitle?: string | null;
  section?: string | null;
}

export interface SubjectAreaAssessment {
  area: QualitativeSubjectArea;
  score: number;
  confidence: number;
  summary: string;
  themes: string[];
  offerings?: string[];
  narrativeSummary?: string | null;
  synthesisMethod?: "deterministic" | "llm" | "cursor" | "openai" | null;
  signals: QualitativeSignal[];
}

export type DocumentInventoryStatus =
  | "discovered"
  | "extracted"
  | "unsupported_format"
  | "failed"
  | "extract_failed"
  | "empty";

export interface DocumentInventoryItem {
  url: string;
  label: string;
  format: string;
  status: DocumentInventoryStatus;
  foundOn?: string;
  pageCount?: string;
  charCount?: string;
  listItems?: string;
}

export interface QualitativeCaptureRecord {
  urn: string;
  name: string;
  assessedAt: string;
  engineVersion: string;
  sourcesScanned: number;
  sourceTypes?: QualitativeSourceType[];
  areas: SubjectAreaAssessment[];
  captureNotes?: string[];
  documentsDiscovered?: number;
  documentsExtracted?: number;
  documentInventory?: DocumentInventoryItem[];
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
  /** GIAS OpenDate (YYYY-MM-DD) when known. */
  openDate?: string | null;
  /** GIAS ReasonEstablishmentOpened label when known. */
  reasonEstablishmentOpened?: string | null;
  /** Merged from contact-capture sidecar when enriched. */
  contactCapture?: ContactCaptureRecord | null;
  contactCaptureEnrichedAt?: string | null;
  /** Merged from qualitative-capture sidecar when enriched. */
  qualitativeCapture?: QualitativeCaptureRecord | null;
  qualitativeCaptureEnrichedAt?: string | null;

  /** DfE school capacity (SCAP) — places vs pupils on roll. */
  schoolPlaces?: number | null;
  pupilsOnRoll?: number | null;
  placesFillPercent?: number | null;
  pupilsOverCapacity?: number | null;
  unfilledPlaces?: number | null;
  placesPeriod?: string | null;
  placesSource?: string | null;

  /**
   * DfE applications & offers (school-level). Demand pressure context —
   * not an admission probability or catchment participation rate.
   */
  admissionEntryYear?: string | null;
  admissionPhase?: string | null;
  admissionPlacesOffered?: number | null;
  firstPreferenceApplications?: number | null;
  anyPreferenceApplications?: number | null;
  firstPreferenceOffers?: number | null;
  firstPreferenceDemandRatio?: number | null;
  applicationsFromOtherLa?: number | null;
  offersToOtherLa?: number | null;
  admissionsPeriod?: string | null;
  admissionsSource?: string | null;
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
  ks5Period?: string | null;
  schoolCount?: number | null;
  ks5SchoolCount?: number | null;
  note?: string | null;
}

/** Local-authority / England phonics screening figures (not school-level). */
export interface PhonicsAreaBench {
  year1Expected?: number | null;
  year1Eligible?: number | null;
  year1DisadvantagedExpected?: number | null;
  endYear2Expected?: number | null;
  endYear2Eligible?: number | null;
  endYear2DisadvantagedExpected?: number | null;
  period?: string | null;
}

export interface PhonicsBenchmarkSet {
  period?: string | null;
  note?: string | null;
  england: PhonicsAreaBench;
  localAuthorities: Record<string, PhonicsAreaBench>;
}

/** Local-authority / England EYFSP figures (not provider-level). */
export interface EyfspAreaBench {
  gldPercent?: number | null;
  gldCount?: number | null;
  allElgsExpectedPercent?: number | null;
  commLangLitExpectedPercent?: number | null;
  elgsExpectedAverage?: number | null;
  childrenCount?: number | null;
}

export interface EyfspBenchmarkSet {
  period?: string | null;
  note?: string | null;
  sourceUrl?: string | null;
  england: EyfspAreaBench;
  localAuthorities: Record<string, EyfspAreaBench>;
}

/** Hampshire seed early-years childcare index (Ofsted MI + EYFSP benches). */
export interface EyProvidersIndex {
  generatedAt: string;
  localAuthority: string;
  ofstedAsAt?: string;
  source: {
    ofstedChildcareMiPage?: string;
    ofstedChildcareMiCsv?: string;
    eyfspDataset?: string;
    eyfspPeriod?: string;
    eyfspPublication?: string;
    note?: string;
  };
  benchmarks: {
    eyfsp?: EyfspBenchmarkSet;
  };
  providers: SchoolRecord[];
  stats: {
    providerCount: number;
    withInspectionGrade?: number;
    withCoordinates?: number;
    ofstedAsAt?: string;
    eyfspPeriod?: string;
    localAuthority?: string;
  };
}

/** Hampshire consented childminders / domestic childcare (directory + map). */
export interface ChildmindersIndex {
  generatedAt: string;
  localAuthority: string;
  consentedAsAt?: string;
  ofstedAsAt?: string;
  source: {
    consentedAddressesPage?: string;
    consentedAddressesCsv?: string;
    ofstedChildcareMiPage?: string;
    ofstedChildcareMiCsv?: string;
    refreshNote?: string;
    note?: string;
  };
  providers: SchoolRecord[];
  stats: {
    providerCount: number;
    withInspectionGrade?: number;
    withCoordinates?: number;
    consentedAsAt?: string;
    ofstedAsAt?: string;
    localAuthority?: string;
  };
}

export interface SchoolsIndex {
  generatedAt: string;
  period: string;
  phonicsEnrichedAt?: string;
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
    stateKs4?: IndependentBenchmarkSet;
    phonics?: PhonicsBenchmarkSet;
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
    stateWithKs4?: number;
    withKs4?: number;
    independentWithKs5?: number;
    stateWithKs5?: number;
    withKs5?: number;
    independentWithOfsted?: number;
    independentEnriched?: boolean;
    stateWithOfsted?: number;
    hampshireEyStateWithOfsted?: number;
    ks4Period?: string;
    ks5Period?: string;
    ofstedAsAt?: string;
    ofstedStateAsAt?: string;
    phonicsPeriod?: string;
    phonicsLaCount?: number;
    phonicsEnriched?: boolean;
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
