// Export canvas as PNG while preserving the template's DPI and bit depth.
// canvas.toBlob() always yields 32-bit RGBA PNG with no pHYs chunk (=> 96 dpi),
// so we encode the PNG ourselves.

export interface TemplateImageInfo {
  dpiX: number;
  dpiY: number;
  hasAlpha: boolean; // true => 32-bit RGBA, false => 24-bit RGB
}

const DEFAULT_INFO: TemplateImageInfo = { dpiX: 96, dpiY: 96, hasAlpha: false };

// ---------- Read info from the template file ----------

export const readTemplateInfo = async (file: File): Promise<TemplateImageInfo> => {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const png = readPngInfo(buf);
    if (png) return png;
    const jpg = readJpegInfo(buf);
    if (jpg) return jpg;
  } catch (e) {
    console.warn('Could not read template image info', e);
  }
  return { ...DEFAULT_INFO };
};

const readPngInfo = (b: Uint8Array): TemplateImageInfo | null => {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 8 || sig.some((v, i) => b[i] !== v)) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const info: TemplateImageInfo = { ...DEFAULT_INFO };
  let pos = 8;
  while (pos + 8 <= b.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    const data = pos + 8;
    if (type === 'IHDR') {
      const colorType = b[data + 9];
      info.hasAlpha = colorType === 4 || colorType === 6;
    } else if (type === 'pHYs' && b[data + 8] === 1) {
      info.dpiX = Math.round(dv.getUint32(data) * 0.0254);
      info.dpiY = Math.round(dv.getUint32(data + 4) * 0.0254);
    } else if (type === 'tRNS') {
      info.hasAlpha = true;
    } else if (type === 'IDAT') {
      break;
    }
    pos = data + len + 4;
  }
  return info;
};

const readJpegInfo = (b: Uint8Array): TemplateImageInfo | null => {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  const info: TemplateImageInfo = { ...DEFAULT_INFO };
  let pos = 2;
  while (pos + 4 < b.length && b[pos] === 0xff) {
    const marker = b[pos + 1];
    const len = (b[pos + 2] << 8) | b[pos + 3];
    // APP0 JFIF
    if (marker === 0xe0 && b[pos + 4] === 0x4a && b[pos + 5] === 0x46) {
      const units = b[pos + 11];
      const xd = (b[pos + 12] << 8) | b[pos + 13];
      const yd = (b[pos + 14] << 8) | b[pos + 15];
      if (units === 1 && xd && yd) { info.dpiX = xd; info.dpiY = yd; return info; }
      if (units === 2 && xd && yd) {
        info.dpiX = Math.round(xd * 2.54); info.dpiY = Math.round(yd * 2.54); return info;
      }
    }
    if (marker === 0xda) break; // start of scan
    pos += 2 + len;
  }
  return info;
};

// ---------- PNG encoder ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf: Uint8Array): number => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const makeChunk = (type: string, data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
};

// zlib-wrapped deflate, as PNG IDAT requires
const zlibDeflate = async (raw: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

// Build filtered scanlines (picks None/Sub/Up per row by min sum of abs values)
const buildScanlines = (px: Uint8ClampedArray, w: number, h: number, bpp: number): Uint8Array => {
  const stride = w * bpp;
  const out = new Uint8Array((stride + 1) * h);
  const none = new Uint8Array(stride);
  const sub = new Uint8Array(stride);
  const up = new Uint8Array(stride);
  const row = new Uint8Array(stride);
  let prev = new Uint8Array(stride);
  const score = (a: Uint8Array) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] < 128 ? a[i] : 256 - a[i];
    return s;
  };

  for (let y = 0; y < h; y++) {
    // fill `row` with raw pixel bytes (RGB or RGBA)
    if (bpp === 4) {
      row.set(px.subarray(y * stride, (y + 1) * stride));
    } else {
      let o = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = px[i + 3];
        if (a === 255) {
          row[o++] = px[i]; row[o++] = px[i + 1]; row[o++] = px[i + 2];
        } else { // composite over white
          const f = a / 255;
          row[o++] = Math.round(px[i] * f + 255 * (1 - f));
          row[o++] = Math.round(px[i + 1] * f + 255 * (1 - f));
          row[o++] = Math.round(px[i + 2] * f + 255 * (1 - f));
        }
      }
    }
    for (let i = 0; i < stride; i++) {
      none[i] = row[i];
      sub[i] = (row[i] - (i >= bpp ? row[i - bpp] : 0)) & 0xff;
      up[i] = (row[i] - prev[i]) & 0xff;
    }
    const sN = score(none), sS = score(sub), sU = score(up);
    let ft = 0, best = none;
    if (sS < sN && sS <= sU) { ft = 1; best = sub; }
    else if (sU < sN) { ft = 2; best = up; }
    const base = y * (stride + 1);
    out[base] = ft;
    out.set(best, base + 1);
    prev = row.slice();
  }
  return out;
};

export const canvasToPngBlob = async (
  canvas: HTMLCanvasElement,
  info: TemplateImageInfo
): Promise<Blob> => {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const px = ctx.getImageData(0, 0, w, h).data;
  const bpp = info.hasAlpha ? 4 : 3;

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8;                    // bit depth per channel
  ihdr[9] = info.hasAlpha ? 6 : 2; // 6 = RGBA (32-bit), 2 = RGB (24-bit)

  const phys = new Uint8Array(9);
  const pv = new DataView(phys.buffer);
  pv.setUint32(0, Math.round(info.dpiX / 0.0254));
  pv.setUint32(4, Math.round(info.dpiY / 0.0254));
  phys[8] = 1; // unit: metre

  const idat = await zlibDeflate(buildScanlines(px, w, h, bpp));

  return new Blob(
    [
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      makeChunk('IHDR', ihdr),
      makeChunk('pHYs', phys),
      makeChunk('IDAT', idat),
      makeChunk('IEND', new Uint8Array(0)),
    ],
    { type: 'image/png' }
  );
};
