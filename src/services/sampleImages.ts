/**
 * Generates sample images with embedded EXIF, GPS, and AI provenance metadata
 * so users can test Cleanmeta without needing to supply their own files.
 */

// Helper to format bytes as standard binary strings
function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

/**
 * Creates an image canvas with a graphic and returns it as a base JPEG/PNG blob.
 */
async function drawCanvasGraphic(
  theme: 'street' | 'ai' | 'portrait',
  width = 1200,
  height = 900
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (theme === 'street') {
    // Elegant warm architectural scene
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1c1b18');
    grad.addColorStop(0.5, '#2c2720');
    grad.addColorStop(1, '#181614');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Architectural facade lines
    ctx.strokeStyle = 'rgba(235, 220, 195, 0.15)';
    ctx.lineWidth = 2;
    for (let x = 60; x < width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x, height - 80);
      ctx.stroke();
    }
    // Window arches
    for (let x = 120; x < width - 120; x += 240) {
      ctx.fillStyle = 'rgba(240, 180, 80, 0.12)';
      ctx.fillRect(x, 160, 140, 220);
      ctx.beginPath();
      ctx.arc(x + 70, 160, 70, Math.PI, 0);
      ctx.fill();
    }
    // Title watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '500 24px Manrope, sans-serif';
    ctx.fillText('Sample Street Photography (Sony α7 IV · 35mm · GPS Active)', 80, height - 100);
  } else if (theme === 'ai') {
    // Surreal architectural AI render
    const grad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 1.5);
    grad.addColorStop(0, '#2d1b4e');
    grad.addColorStop(0.5, '#151326');
    grad.addColorStop(1, '#09080e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Abstract geometric sculptures
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1.5;
    for (let r = 60; r < 360; r += 40) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 20, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 24px Manrope, sans-serif';
    ctx.fillText('Sample Generative Synthesis (SDXL 1.0 · C2PA Manifest Tag)', 80, height - 100);
  } else {
    // Minimal studio portrait
    ctx.fillStyle = '#1e2229';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '500 24px Manrope, sans-serif';
    ctx.fillText('Sample Smartphone Photo (iOS 18.1 · Rotated 90° CW)', 80, height - 100);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
  });
}

/**
 * Injects genuine EXIF + GPS bytes into a standard JPEG.
 * Builds standard TIFF IFD structure with Make, Model, Lens, DateTime, GPS Latitude/Longitude, etc.
 */
function injectExifAndGpsIntoJpeg(jpegBytes: Uint8Array): Uint8Array {
  // Build a minimal, compliant APP1 EXIF segment
  // Exif header: 'Exif\0\0' (6 bytes)
  // TIFF Header: 'II' (little endian, 0x49 0x49), 42 (0x2A 0x00), offset to 0th IFD (0x08 0x00 0x00 0x00)
  const exif = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00 // TIFF header, offset 8
  ];

  // Number of IFD0 entries: 7
  // Make (0x010F), Model (0x0110), Orientation (0x0112), Software (0x0131), DateTime (0x0132), ExifIFD (0x8769), GPSInfo (0x8825)
  const ifd0Entries = 7;
  const ifd0: number[] = [ifd0Entries & 0xff, (ifd0Entries >> 8) & 0xff];

  // Offsets will be calculated relative to TIFF header start (offset 6 in APP1 payload)
  let dataOffset = 8 + 2 + ifd0Entries * 12 + 4; // after IFD0 entries + next IFD pointer

  // Helper to add IFD tag: tag (2), type (2), count (4), value/offset (4)
  function addTag(tag: number, type: number, count: number, valueOrOffset: number) {
    ifd0.push(tag & 0xff, (tag >> 8) & 0xff);
    ifd0.push(type & 0xff, (type >> 8) & 0xff);
    ifd0.push(count & 0xff, (count >> 8) & 0xff, (count >> 16) & 0xff, (count >> 24) & 0xff);
    ifd0.push(
      valueOrOffset & 0xff,
      (valueOrOffset >> 8) & 0xff,
      (valueOrOffset >> 16) & 0xff,
      (valueOrOffset >> 24) & 0xff
    );
  }

  const makeStr = 'Sony\0';
  const modelStr = 'ILCE-7M4\0';
  const softwareStr = 'Sony Imaging Edge 3.2\0';
  const dateStr = '2026:09:14 15:42:09\0';

  const makeOffset = dataOffset;
  dataOffset += makeStr.length;
  const modelOffset = dataOffset;
  dataOffset += modelStr.length;
  const softwareOffset = dataOffset;
  dataOffset += softwareStr.length;
  const dateOffset = dataOffset;
  dataOffset += dateStr.length;

  const exifIfdOffset = dataOffset;
  // SubIFD space: 5 entries (2 + 5*12 + 4) = 66 bytes
  dataOffset += 66;

  const gpsIfdOffset = dataOffset;
  // GPS IFD space: 5 entries = 66 bytes + data
  dataOffset += 120;

  addTag(0x010f, 2, makeStr.length, makeOffset); // Make
  addTag(0x0110, 2, modelStr.length, modelOffset); // Model
  addTag(0x0112, 3, 1, 1); // Orientation: Normal (1)
  addTag(0x0131, 2, softwareStr.length, softwareOffset); // Software
  addTag(0x0132, 2, dateStr.length, dateOffset); // DateTime
  addTag(0x8769, 4, 1, exifIfdOffset); // ExifIFD pointer
  addTag(0x8825, 4, 1, gpsIfdOffset); // GPSInfo pointer

  // Next IFD offset: 0
  ifd0.push(0x00, 0x00, 0x00, 0x00);

  // Append data strings
  const dataBytes: number[] = [
    ...stringToBytes(makeStr),
    ...stringToBytes(modelStr),
    ...stringToBytes(softwareStr),
    ...stringToBytes(dateStr)
  ];

  // Exif SubIFD (FNumber 2.8, ExposureTime 1/500, ISO 160, LensModel)
  const exifEntries = 4;
  const subIfdBytes: number[] = [exifEntries & 0xff, (exifEntries >> 8) & 0xff];
  const lensModelStr = 'FE 24-70mm F2.8 GM II\0';
  const lensOffset = gpsIfdOffset + 140;

  // ISO: 160 (tag 0x8827, type 3)
  subIfdBytes.push(0x27, 0x88, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0xa0, 0x00, 0x00, 0x00);
  // LensModel: (tag 0xA434, type 2)
  subIfdBytes.push(
    0x34, 0xa4, 0x02, 0x00,
    lensModelStr.length & 0xff, (lensModelStr.length >> 8) & 0xff, 0x00, 0x00,
    lensOffset & 0xff, (lensOffset >> 8) & 0xff, (lensOffset >> 16) & 0xff, (lensOffset >> 24) & 0xff
  );
  // FNumber: 2.8 (rational)
  const fnumOffset = lensOffset + lensModelStr.length;
  subIfdBytes.push(
    0x9d, 0x82, 0x05, 0x00, 0x01, 0x00, 0x00, 0x00,
    fnumOffset & 0xff, (fnumOffset >> 8) & 0xff, (fnumOffset >> 16) & 0xff, (fnumOffset >> 24) & 0xff
  );
  // ExposureTime: 1/500 (rational)
  const expOffset = fnumOffset + 8;
  subIfdBytes.push(
    0x9a, 0x82, 0x05, 0x00, 0x01, 0x00, 0x00, 0x00,
    expOffset & 0xff, (expOffset >> 8) & 0xff, (expOffset >> 16) & 0xff, (expOffset >> 24) & 0xff
  );
  subIfdBytes.push(0x00, 0x00, 0x00, 0x00);

  // GPS IFD: GPSLatitudeRef 'N', GPSLatitude (37 deg, 46 min, 29.64 sec), GPSLongitudeRef 'W', GPSLongitude (122 deg, 25 min, 9.84 sec)
  const gpsEntries = 4;
  const gpsIfdBytes: number[] = [gpsEntries & 0xff, (gpsEntries >> 8) & 0xff];
  const gpsCoordOffset = expOffset + 8;

  // GPSLatitudeRef (tag 0x0001, type 2, count 2, value 'N\0')
  gpsIfdBytes.push(0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0x4e, 0x00, 0x00, 0x00);
  // GPSLatitude (tag 0x0002, type 5, count 3, offset)
  gpsIfdBytes.push(
    0x02, 0x00, 0x05, 0x00, 0x03, 0x00, 0x00, 0x00,
    gpsCoordOffset & 0xff, (gpsCoordOffset >> 8) & 0xff, (gpsCoordOffset >> 16) & 0xff, (gpsCoordOffset >> 24) & 0xff
  );
  // GPSLongitudeRef (tag 0x0003, type 2, count 2, value 'W\0')
  gpsIfdBytes.push(0x03, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0x57, 0x00, 0x00, 0x00);
  // GPSLongitude (tag 0x0004, type 5, count 3, offset)
  const gpsLongOffset = gpsCoordOffset + 24;
  gpsIfdBytes.push(
    0x04, 0x00, 0x05, 0x00, 0x03, 0x00, 0x00, 0x00,
    gpsLongOffset & 0xff, (gpsLongOffset >> 8) & 0xff, (gpsLongOffset >> 16) & 0xff, (gpsLongOffset >> 24) & 0xff
  );
  gpsIfdBytes.push(0x00, 0x00, 0x00, 0x00);

  // Extra data: lens string, rationals
  const extraData: number[] = [
    ...stringToBytes(lensModelStr),
    // FNumber: 28/10
    0x1c, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00,
    // ExposureTime: 1/500
    0x01, 0x00, 0x00, 0x00, 0xf4, 0x01, 0x00, 0x00,
    // GPS Latitude: 37/1, 46/1, 2964/100
    0x25, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x2e, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x94, 0x0b, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00,
    // GPS Longitude: 122/1, 25/1, 984/100
    0x7a, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x19, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0xd8, 0x03, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00
  ];

  // Assemble full APP1 payload
  const app1Payload = [
    ...exif,
    ...ifd0,
    ...dataBytes,
    ...subIfdBytes,
    ...gpsIfdBytes,
    ...extraData
  ];

  const app1Length = app1Payload.length + 2;
  const app1Marker = [0xff, 0xe1, (app1Length >> 8) & 0xff, app1Length & 0xff, ...app1Payload];

  // Insert after SOI (0xFF, 0xD8)
  const result = new Uint8Array(jpegBytes.length + app1Marker.length);
  result.set(jpegBytes.subarray(0, 2), 0);
  result.set(new Uint8Array(app1Marker), 2);
  result.set(jpegBytes.subarray(2), 2 + app1Marker.length);
  return result;
}

/**
 * Injects genuine AI generation metadata (XMP + C2PA marker) into a JPEG.
 */
function injectAiMetadataIntoJpeg(jpegBytes: Uint8Array): Uint8Array {
  // XMP packet with Stable Diffusion / ComfyUI / C2PA attributes
  const xmpString = `http://ns.adobe.com/xap/1.0/\0<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
        xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"
        xmlns:c2pa="http://c2pa.org/manifest/1.0/">
      <dc:creator><rdf:Seq><rdf:li>Stable Diffusion v1.5 / Automatic1111</rdf:li></rdf:Seq></dc:creator>
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Brutalist concrete architecture in dawn mist, minimalist stone monolith, 8k resolution, raytracing, sharp architectural photography</rdf:li></rdf:Alt></dc:description>
      <xmp:CreatorTool>Automatic1111 WebUI v1.9.3</xmp:CreatorTool>
      <photoshop:Credit>Generative Synthesis Model SDXL-Turbo</photoshop:Credit>
      <Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>
      <c2pa:manifest>urn:c2pa:manifest:ai-provenance-sdxl-10492847</c2pa:manifest>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const xmpPayload = stringToBytes(xmpString);
  const app1Length = xmpPayload.length + 2;
  const app1Marker = [0xff, 0xe1, (app1Length >> 8) & 0xff, app1Length & 0xff, ...xmpPayload];

  // Also add a Comment marker (COM 0xFFFE) with SD generation parameters
  const commentStr =
    'parameters: Brutalist concrete architecture in dawn mist, minimalist stone monolith, 8k resolution\nNegative prompt: blurry, deformed, cartoon, oversaturated, low quality\nSteps: 32, Sampler: DPM++ 2M Karras, CFG scale: 7.5, Seed: 394820194, Size: 1200x900, Model: SDXL_v1.0';
  const comBytes = stringToBytes(commentStr);
  const comLength = comBytes.length + 2;
  const comMarker = [0xff, 0xfe, (comLength >> 8) & 0xff, comLength & 0xff, ...comBytes];

  const totalAdded = app1Marker.length + comMarker.length;
  const result = new Uint8Array(jpegBytes.length + totalAdded);
  result.set(jpegBytes.subarray(0, 2), 0);
  result.set(new Uint8Array(app1Marker), 2);
  result.set(new Uint8Array(comMarker), 2 + app1Marker.length);
  result.set(jpegBytes.subarray(2), 2 + totalAdded);
  return result;
}

export async function createSampleFile(
  type: 'street_gps' | 'ai_synthesis' | 'portrait_orientation'
): Promise<File> {
  if (type === 'street_gps') {
    const rawBlob = await drawCanvasGraphic('street', 1200, 900);
    const buf = new Uint8Array(await rawBlob.arrayBuffer());
    const withExif = injectExifAndGpsIntoJpeg(buf);
    return new File([withExif.buffer as ArrayBuffer], 'sample_street_photo_with_gps.jpg', { type: 'image/jpeg' });
  }

  if (type === 'ai_synthesis') {
    const rawBlob = await drawCanvasGraphic('ai', 1200, 900);
    const buf = new Uint8Array(await rawBlob.arrayBuffer());
    const withAi = injectAiMetadataIntoJpeg(buf);
    return new File([withAi.buffer as ArrayBuffer], 'sample_generative_art_sdxl.jpg', { type: 'image/jpeg' });
  }

  // Portrait orientation
  const rawBlob = await drawCanvasGraphic('portrait', 900, 1200);
  const buf = new Uint8Array(await rawBlob.arrayBuffer());
  const withExif = injectExifAndGpsIntoJpeg(buf);
  return new File([withExif.buffer as ArrayBuffer], 'sample_mobile_portrait.jpg', { type: 'image/jpeg' });
}
