export interface ImageFileSummary {
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
  extension: string;
  width: number;
  height: number;
  aspectRatio: string;
  previewUrl: string;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
  formattedLatitude: string;
  formattedLongitude: string;
  googleMapsUrl: string;
}

export interface AiProvenanceData {
  detected: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  generatorName?: string;
  prompts?: string;
  parameters?: Record<string, string>;
  c2paDetected: boolean;
  c2paManifestInfo?: string;
  details: string[];
  disclaimer: string;
}

export interface MetadataCategorySummary {
  id: string;
  name: string;
  count: number;
  tags: { key: string; value: string; description?: string }[];
}

export interface MetadataInspectionResult {
  summary: ImageFileSummary;
  rawExif: Record<string, any>;
  gps: GpsData | null;
  xmp: Record<string, any>;
  iptc: Record<string, any>;
  icc: Record<string, any> | null;
  aiProvenance: AiProvenanceData;
  categories: MetadataCategorySummary[];
  totalFieldsCount: number;
  hasSensitiveData: boolean; // GPS, camera serial, creator name
  orientation?: number;
}

export interface CleanReport {
  cleanedBlob: Blob;
  cleanedUrl: string;
  cleanedSize: number;
  cleanedFormattedSize: string;
  sizeDifferenceBytes: number;
  sizeDifferencePercentage: number;
  cleanedInspection: MetadataInspectionResult;
  removedCategories: string[];
  remainingCategories: string[];
  qualityUsed: number;
  formatUsed: string;
  transparencyPreserved: boolean;
  orientationNormalized: boolean;
}

export type ProcessingState =
  | 'idle'
  | 'inspecting'
  | 'inspected'
  | 'cleaning'
  | 'cleaned'
  | 'error';
