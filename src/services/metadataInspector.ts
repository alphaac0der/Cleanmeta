import exifr from 'exifr';
import {
  AiProvenanceData,
  GpsData,
  ImageFileSummary,
  MetadataCategorySummary,
  MetadataInspectionResult
} from '../types/metadata';

// Format human-readable file size
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Compute greatest common divisor for aspect ratio
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return 'Unknown';
  const divisor = gcd(width, height);
  const wRatio = width / divisor;
  const hRatio = height / divisor;
  // If common photo ratio
  if (wRatio <= 21 && hRatio <= 21) {
    return `${wRatio}:${hRatio}`;
  }
  return (width / height).toFixed(2) + ':1';
}

/**
 * Scans raw bytes for JPEG COM markers, PNG text chunks, and C2PA markers.
 */
function scanBinaryExtras(bytes: Uint8Array): {
  comments: string[];
  pngTexts: Record<string, string>;
  c2paDetected: boolean;
  c2paDetails?: string;
} {
  const comments: string[] = [];
  const pngTexts: Record<string, string> = {};
  let c2paDetected = false;
  let c2paDetails: string | undefined = undefined;

  // Convert first portion to text for quick signature scan
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const sampleText = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 500000)));

  // C2PA / Content Credentials Check
  if (
    sampleText.includes('urn:c2pa:') ||
    sampleText.includes('c2pa.manifest') ||
    sampleText.includes('c2pa.assertion') ||
    sampleText.includes('http://c2pa.org/') ||
    sampleText.includes('jumb')
  ) {
    c2paDetected = true;
    c2paDetails = 'Content Credentials (C2PA JUMBF / manifest assertion signature detected)';
  }

  // Scan JPEG COM (0xFF, 0xFE) markers
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xfe) {
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      if (len > 2 && i + 2 + len <= bytes.length) {
        const comBytes = bytes.subarray(i + 4, i + 2 + len);
        try {
          const str = decoder.decode(comBytes).trim();
          if (str && !comments.includes(str)) {
            comments.push(str);
          }
        } catch {
          // ignore decoding errors
        }
      }
    }
  }

  // Scan PNG chunks for tEXt / zTXt / iTXt
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    let offset = 8;
    while (offset < bytes.length - 8) {
      const length =
        (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3];
      const type = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );

      if (type === 'tEXt' && length > 0) {
        const chunkData = bytes.subarray(offset + 8, offset + 8 + length);
        // Format: keyword\0text
        const nullIdx = chunkData.indexOf(0);
        if (nullIdx > 0) {
          const key = decoder.decode(chunkData.subarray(0, nullIdx));
          const val = decoder.decode(chunkData.subarray(nullIdx + 1));
          pngTexts[key] = val;
        }
      } else if (type === 'c2pa') {
        c2paDetected = true;
        c2paDetails = 'PNG c2pa dedicated manifest chunk detected';
      }

      // Next chunk: length (4) + type (4) + data (length) + crc (4)
      offset += 12 + length;
    }
  }

  return { comments, pngTexts, c2paDetected, c2paDetails };
}

/**
 * Deep inspection of AI provenance signals.
 */
function evaluateAiProvenance(
  exif: Record<string, any>,
  xmp: Record<string, any>,
  comments: string[],
  pngTexts: Record<string, string>,
  c2paDetected: boolean,
  c2paDetails?: string
): AiProvenanceData {
  const details: string[] = [];
  let detected = false;
  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
  let generatorName: string | undefined = undefined;
  let prompts: string | undefined = undefined;
  const parameters: Record<string, string> = {};

  // Aggregate candidate strings
  const candidateTexts: string[] = [
    ...comments,
    ...Object.values(pngTexts),
    xmp?.CreatorTool,
    xmp?.creator,
    xmp?.description,
    xmp?.Credit,
    xmp?.History,
    xmp?.DigitalSourceType,
    exif?.Software,
    exif?.ImageDescription,
    exif?.UserComment
  ].filter(Boolean).map(String);

  const fullText = candidateTexts.join(' \n ');

  // 1. Stable Diffusion / Automatic1111 / ComfyUI / Fooocus check
  if (
    /parameters:\s*/i.test(fullText) ||
    /negative prompt:/i.test(fullText) ||
    /automatic1111/i.test(fullText) ||
    /stable diffusion/i.test(fullText) ||
    pngTexts['parameters']
  ) {
    detected = true;
    confidence = 'high';
    generatorName = 'Stable Diffusion (Automatic1111 / WebUI)';
    details.push('Embedded Stable Diffusion generation parameters found');

    const rawParam = pngTexts['parameters'] || comments.find((c) => /parameters:/i.test(c)) || fullText;
    if (rawParam) {
      prompts = rawParam.split('Negative prompt:')[0].replace(/^parameters:\s*/i, '').trim();
      // Parse steps, sampler, seed, etc.
      const paramMatches = rawParam.match(/([A-Za-z\s]+):\s*([^,]+)/g);
      if (paramMatches) {
        for (const m of paramMatches) {
          const parts = m.split(':');
          if (parts.length >= 2) {
            parameters[parts[0].trim()] = parts.slice(1).join(':').trim();
          }
        }
      }
    }
  }

  // 2. ComfyUI workflow check
  if (/comfyui/i.test(fullText) || pngTexts['workflow'] || pngTexts['prompt']) {
    detected = true;
    confidence = 'high';
    generatorName = generatorName || 'ComfyUI Node Workflow';
    details.push('ComfyUI node execution graph and prompt dictionary found');
    if (!prompts && pngTexts['prompt']) {
      prompts = pngTexts['prompt'].slice(0, 300) + '...';
    }
  }

  // 3. Midjourney check
  if (/midjourney/i.test(fullText)) {
    detected = true;
    confidence = 'high';
    generatorName = generatorName || 'Midjourney';
    details.push('Midjourney creator tool signature detected');
  }

  // 4. DALL-E / OpenAI check
  if (/dall-e/i.test(fullText) || /openai/i.test(fullText)) {
    detected = true;
    confidence = 'high';
    generatorName = generatorName || 'DALL-E / OpenAI';
    details.push('DALL-E generation provenance indicator found');
  }

  // 5. Adobe Firefly / Generative Fill check
  if (/firefly/i.test(fullText) || /generative fill/i.test(fullText)) {
    detected = true;
    confidence = 'high';
    generatorName = generatorName || 'Adobe Firefly';
    details.push('Adobe Firefly / Generative Fill marker identified in XMP history');
  }

  // 6. IPTC trainedAlgorithmicMedia (official standard)
  if (/trainedalgorithmicmedia/i.test(fullText)) {
    detected = true;
    confidence = 'high';
    generatorName = generatorName || 'Trained Algorithmic Media (IPTC)';
    details.push('Standard IPTC DigitalSourceType: trainedAlgorithmicMedia');
  }

  // 7. C2PA Content Credentials
  if (c2paDetected) {
    detected = true;
    if (confidence === 'none') confidence = 'medium';
    details.push(c2paDetails || 'C2PA Content Credentials metadata signature detected');
  }

  const disclaimer =
    'Note: Absence of AI metadata does not certify human creation, and cleaning metadata does not guarantee third-party platforms will remove an AI content label. Social platforms often utilize independent perceptual hashing and watermarking algorithms.';

  return {
    detected,
    confidence,
    generatorName,
    prompts,
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    c2paDetected,
    c2paManifestInfo: c2paDetails,
    details,
    disclaimer
  };
}

/**
 * Format raw EXIF/XMP values for display.
 */
function formatTagValue(key: string, value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return value.toISOString().replace('T', ' ').slice(0, 19);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (key.toLowerCase().includes('exposuretime') && typeof value === 'number') {
    if (value < 1 && value > 0) {
      return `1/${Math.round(1 / value)}s`;
    }
    return `${value}s`;
  }
  if (key.toLowerCase().includes('fnumber') && typeof value === 'number') {
    return `f/${value}`;
  }
  if (key.toLowerCase().includes('focallength') && typeof value === 'number') {
    return `${value} mm`;
  }
  if (key.toLowerCase().includes('iso') && typeof value === 'number') {
    return `ISO ${value}`;
  }
  return String(value);
}

/**
 * Main Inspector: extracts and structures all metadata from an image file.
 */
export async function inspectImageMetadata(file: File): Promise<MetadataInspectionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 1. Get visual dimensions
  let width = 0;
  let height = 0;
  let previewUrl = '';
  try {
    previewUrl = URL.createObjectURL(file);
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  } catch {
    // Fallback for svg or tricky formats
    width = 0;
    height = 0;
  }

  const extension = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  const summary: ImageFileSummary = {
    file,
    name: file.name,
    size: file.size,
    formattedSize: formatBytes(file.size),
    type: file.type || `image/${extension.toLowerCase()}`,
    extension,
    width,
    height,
    aspectRatio: calculateAspectRatio(width, height),
    previewUrl
  };

  // 2. Parse with exifr
  let rawParsed: Record<string, any> = {};
  let gpsParsed: any = null;
  try {
    rawParsed =
      (await exifr.parse(arrayBuffer, {
        tiff: true,
        xmp: true,
        icc: true,
        iptc: true,
        jfif: true,
        mergeOutput: false
      })) || {};
  } catch (err) {
    console.warn('exifr parse notice:', err);
  }

  try {
    gpsParsed = await exifr.gps(arrayBuffer);
  } catch {
    // ignore
  }

  // 3. Scan binary extras (comments, png chunks, C2PA)
  const binaryExtras = scanBinaryExtras(bytes);

  const tiff = rawParsed.ifd0 || rawParsed.tiff || {};
  const exifSub = rawParsed.exif || {};
  const xmp = rawParsed.xmp || {};
  const iptc = rawParsed.iptc || {};
  const icc = rawParsed.icc || null;

  // Flatten EXIF for quick tag access
  const allExif: Record<string, any> = { ...tiff, ...exifSub };

  // 4. GPS formatting
  let gps: GpsData | null = null;
  if (gpsParsed && gpsParsed.latitude !== undefined && gpsParsed.longitude !== undefined) {
    const lat = Number(gpsParsed.latitude);
    const lon = Number(gpsParsed.longitude);
    const latRef = lat >= 0 ? 'N' : 'S';
    const lonRef = lon >= 0 ? 'E' : 'W';
    const formattedLat = `${Math.abs(lat).toFixed(6)}° ${latRef}`;
    const formattedLon = `${Math.abs(lon).toFixed(6)}° ${lonRef}`;
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

    gps = {
      latitude: lat,
      longitude: lon,
      altitude: gpsParsed.altitude ? Number(gpsParsed.altitude) : undefined,
      formattedLatitude: formattedLat,
      formattedLongitude: formattedLon,
      googleMapsUrl
    };
  }

  // 5. AI Provenance
  const aiProvenance = evaluateAiProvenance(
    allExif,
    xmp,
    binaryExtras.comments,
    binaryExtras.pngTexts,
    binaryExtras.c2paDetected,
    binaryExtras.c2paDetails
  );

  // 6. Build structured categories
  const categories: MetadataCategorySummary[] = [];

  // Category: Camera & Capture
  const cameraTags: { key: string; value: string; description?: string }[] = [];
  const cameraKeys = [
    'Make',
    'Model',
    'LensModel',
    'LensMake',
    'ExposureTime',
    'FNumber',
    'ISO',
    'FocalLength',
    'FocalLengthIn35mmFormat',
    'Flash',
    'WhiteBalance',
    'ExposureProgram',
    'MeteringMode'
  ];
  for (const k of cameraKeys) {
    if (allExif[k] !== undefined) {
      cameraTags.push({ key: k, value: formatTagValue(k, allExif[k]) });
    }
  }
  if (cameraTags.length > 0) {
    categories.push({
      id: 'camera',
      name: 'Camera & Hardware EXIF',
      count: cameraTags.length,
      tags: cameraTags
    });
  }

  // Category: Location & GPS
  if (gps) {
    categories.push({
      id: 'gps',
      name: 'GPS Geolocation Coordinates',
      count: 3,
      tags: [
        { key: 'Latitude', value: gps.formattedLatitude },
        { key: 'Longitude', value: gps.formattedLongitude },
        ...(gps.altitude ? [{ key: 'Altitude', value: `${gps.altitude.toFixed(1)} m` }] : [])
      ]
    });
  }

  // Category: Timestamps & Dates
  const timestampTags: { key: string; value: string }[] = [];
  const dateKeys = ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSDateStamp'];
  for (const k of dateKeys) {
    if (allExif[k] !== undefined) {
      timestampTags.push({ key: k, value: formatTagValue(k, allExif[k]) });
    }
  }
  if (timestampTags.length > 0) {
    categories.push({
      id: 'timestamps',
      name: 'Timestamps & Capture History',
      count: timestampTags.length,
      tags: timestampTags
    });
  }

  // Category: Software & Processing
  const softwareTags: { key: string; value: string }[] = [];
  const softKeys = ['Software', 'ProcessingSoftware', 'CreatorTool', 'ProfileDescription'];
  for (const k of softKeys) {
    const val = allExif[k] || xmp[k];
    if (val !== undefined) {
      softwareTags.push({ key: k, value: formatTagValue(k, val) });
    }
  }
  if (softwareTags.length > 0) {
    categories.push({
      id: 'software',
      name: 'Software & Device Tools',
      count: softwareTags.length,
      tags: softwareTags
    });
  }

  // Category: AI & Provenance (if present)
  if (aiProvenance.detected) {
    const aiTags: { key: string; value: string }[] = [];
    if (aiProvenance.generatorName) {
      aiTags.push({ key: 'Detected Generator', value: aiProvenance.generatorName });
    }
    if (aiProvenance.c2paDetected) {
      aiTags.push({ key: 'Content Credentials', value: 'C2PA Manifest Present' });
    }
    if (aiProvenance.prompts) {
      aiTags.push({ key: 'Extracted Prompt', value: aiProvenance.prompts });
    }
    if (aiProvenance.parameters) {
      for (const [pk, pv] of Object.entries(aiProvenance.parameters)) {
        aiTags.push({ key: `Parameter [${pk}]`, value: pv });
      }
    }
    categories.push({
      id: 'ai_provenance',
      name: 'AI Provenance & Parameters',
      count: aiTags.length,
      tags: aiTags
    });
  }

  // Category: Other Raw Tags (XMP, IPTC, etc.)
  const otherTags: { key: string; value: string }[] = [];
  for (const [xk, xv] of Object.entries(xmp)) {
    if (!softKeys.includes(xk) && !cameraKeys.includes(xk) && typeof xv !== 'object') {
      otherTags.push({ key: `XMP:${xk}`, value: formatTagValue(xk, xv) });
    }
  }
  for (const [pk, pv] of Object.entries(binaryExtras.pngTexts)) {
    if (pk !== 'parameters') {
      otherTags.push({ key: `PNG:${pk}`, value: pv });
    }
  }
  for (const c of binaryExtras.comments) {
    if (!c.includes('parameters:')) {
      otherTags.push({ key: 'JPEG:Comment', value: c });
    }
  }
  if (otherTags.length > 0) {
    categories.push({
      id: 'other',
      name: 'Ancillary & Embedded Records',
      count: otherTags.length,
      tags: otherTags.slice(0, 20) // show up to 20
    });
  }

  // Calculate total fields count
  let totalFieldsCount = 0;
  for (const c of categories) {
    totalFieldsCount += c.count;
  }

  const hasSensitiveData = Boolean(
    gps ||
    allExif.SerialNumber ||
    allExif.CameraSerialNumber ||
    allExif.Artist ||
    allExif.OwnerName ||
    xmp.creator
  );

  return {
    summary,
    rawExif: allExif,
    gps,
    xmp,
    iptc,
    icc,
    aiProvenance,
    categories,
    totalFieldsCount,
    hasSensitiveData,
    orientation: allExif.Orientation ? Number(allExif.Orientation) : undefined
  };
}
