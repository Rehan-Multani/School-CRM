import QRCode from 'qrcode/lib/core/qrcode';

// Pure-JS QR encoding (no native module): returns the module grid as one SVG
// path so the same data draws in react-native-svg and in the print/PDF HTML.
export function qrPath(text) {
  const qr = QRCode.create(String(text), { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const bits = qr.modules.data;
  let d = '';
  for (let y = 0; y < n; y += 1) {
    let x = 0;
    while (x < n) {
      if (bits[y * n + x]) {
        let w = 1;
        while (x + w < n && bits[y * n + x + w]) w += 1;
        d += `M${x} ${y}h${w}v1h-${w}z`;
        x += w;
      } else x += 1;
    }
  }
  return { size: n, d };
}

const QUIET = 4;

export function qrSvgString(text, px = 320) {
  const { size, d } = qrPath(text);
  const v = size + QUIET * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-QUIET} ${-QUIET} ${v} ${v}" shape-rendering="crispEdges"><rect x="${-QUIET}" y="${-QUIET}" width="${v}" height="${v}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

export const QR_QUIET = QUIET;
