import { CleanReport, MetadataInspectionResult } from '../types/metadata';
import { formatBytes, inspectImageMetadata } from './metadataInspector';

export interface CleaningOptions {
  format?: 'original' | 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number; // 0.85 to 1.0
}

/**
 * Normalizes canvas drawing respecting EXIF orientation.
 * EXIF Orientations:
 * 1: 0° (Normal)
 * 2: Flip horizontal
 * 3: 180°
 * 4: Flip vertical
 * 5: 90° CW + Flip horizontal
 * 6: 90° CW
 * 7: 90° CCW + Flip horizontal
 * 8: 90° CCW (270° CW)
 */
function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
) {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }
}

/**
 * Strips all metadata from an image file using browser-native pixel re-encoding.
 * This completely discards EXIF, GPS, IPTC, XMP, ICC profiles, and C2PA manifests.
 */
export async function cleanImageMetadata(
  originalResult: MetadataInspectionResult,
  options: CleaningOptions = {}
): Promise<CleanReport> {
  const { summary, orientation = 1 } = originalResult;
  const originalFile = summary.file;

  // Determine output mime type
  let targetMime = originalFile.type || 'image/jpeg';
  if (options.format && options.format !== 'original') {
    targetMime = options.format;
  }
  // If unrecognized type, default to jpeg or png
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(targetMime)) {
    targetMime = originalFile.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
  }

  const quality = options.quality ?? 0.95;

  // Load image element
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const objectUrl = URL.createObjectURL(originalFile);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to decode image data into browser canvas'));
    img.src = objectUrl;
  });

  const naturalWidth = img.naturalWidth || summary.width || 1000;
  const naturalHeight = img.naturalHeight || summary.height || 1000;

  // Determine if orientation swaps width and height
  const isRotated90 = [5, 6, 7, 8].includes(orientation);
  const canvasWidth = isRotated90 ? naturalHeight : naturalWidth;
  const canvasHeight = isRotated90 ? naturalWidth : naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d', {
    alpha: targetMime === 'image/png' || targetMime === 'image/webp',
    willReadFrequently: false
  });

  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Could not initialize 2D canvas context for metadata stripping');
  }

  // Draw clean pixels
  if (orientation && orientation > 1) {
    applyOrientationTransform(ctx, orientation, naturalWidth, naturalHeight);
  }
  ctx.drawImage(img, 0, 0);

  // Revoke image source URL
  URL.revokeObjectURL(objectUrl);

  // Encode to cleaned Blob
  const cleanedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode clean image blob'));
      },
      targetMime,
      targetMime === 'image/png' ? undefined : quality
    );
  });

  // Determine file extension
  let ext = 'jpg';
  if (targetMime === 'image/png') ext = 'png';
  else if (targetMime === 'image/webp') ext = 'webp';

  const baseName = summary.name.replace(/\.[^/.]+$/, '');
  const cleanedFileName = `${baseName}_clean.${ext}`;
  const cleanedFile = new File([cleanedBlob], cleanedFileName, { type: targetMime });

  // Re-inspect the cleaned file to verify 100% metadata elimination
  const cleanedInspection = await inspectImageMetadata(cleanedFile);

  // Determine removed categories
  const originalCatNames = originalResult.categories.map((c) => c.name);
  const cleanedCatNames = cleanedInspection.categories.map((c) => c.name);

  const removedCategories = originalCatNames.filter((name) => !cleanedCatNames.includes(name));
  // If original had GPS and cleaned has 0 GPS
  if (originalResult.gps && !cleanedInspection.gps && !removedCategories.includes('GPS Geolocation Coordinates')) {
    removedCategories.push('GPS Geolocation Coordinates');
  }
  if (originalResult.aiProvenance.detected && !cleanedInspection.aiProvenance.detected && !removedCategories.includes('AI Provenance & Parameters')) {
    removedCategories.push('AI Provenance & Parameters');
  }

  const cleanedUrl = URL.createObjectURL(cleanedBlob);
  const sizeDiff = originalFile.size - cleanedBlob.size;
  const sizeDiffPct = originalFile.size > 0 ? (sizeDiff / originalFile.size) * 100 : 0;

  return {
    cleanedBlob,
    cleanedUrl,
    cleanedSize: cleanedBlob.size,
    cleanedFormattedSize: formatBytes(cleanedBlob.size),
    sizeDifferenceBytes: sizeDiff,
    sizeDifferencePercentage: Math.round(sizeDiffPct * 10) / 10,
    cleanedInspection,
    removedCategories,
    remainingCategories: cleanedCatNames,
    qualityUsed: quality,
    formatUsed: targetMime,
    transparencyPreserved: targetMime === 'image/png' || targetMime === 'image/webp',
    orientationNormalized: orientation > 1
  };
}

/**
 * Utility to trigger browser file download.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
