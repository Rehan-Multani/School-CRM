import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import sharp from 'sharp';
import { toWebpDataUri, parseImageDataUri } from '../src/utils/brandAsset.utils.js';

async function bigPng(w, h) {
  const raw = crypto.randomBytes(w * h * 4); // real noise, so the PNG does not compress
  return sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

describe('brand image -> small WebP', () => {
  it('re-encodes a large PNG as a small WebP that fits inside 512px', async () => {
    const png = await bigPng(1600, 1200);
    const uri = `data:image/png;base64,${png.toString('base64')}`;
    expect(uri.length).toBeGreaterThan(1_000_000); // would be a 413 as a JSON body

    const out = await toWebpDataUri(uri, 512);
    const parsed = parseImageDataUri(out);
    expect(parsed.contentType).toBe('image/webp');
    expect(out.length).toBeLessThan(uri.length / 5);

    const meta = await sharp(parsed.buffer).metadata();
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(512);
    expect(meta.format).toBe('webp');
  });

  it('keeps the aspect ratio, never enlarges, and keeps transparency', async () => {
    const small = await sharp({ create: { width: 100, height: 40, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.4 } } }).png().toBuffer();
    const out = await toWebpDataUri(`data:image/png;base64,${small.toString('base64')}`, 512);
    const meta = await sharp(parseImageDataUri(out).buffer).metadata();
    expect([meta.width, meta.height]).toEqual([100, 40]);
    expect(meta.hasAlpha).toBe(true);
  });

  it('leaves SVG, GIF, non-images and broken data untouched', async () => {
    const svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    expect(await toWebpDataUri(svg, 512)).toBe(svg);
    const gif = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    expect(await toWebpDataUri(gif, 512)).toBe(gif);
    expect(await toWebpDataUri('https://example.com/logo.png', 512)).toBe('https://example.com/logo.png');
    expect(await toWebpDataUri('', 512)).toBe('');
    const broken = 'data:image/png;base64,AAAA';
    expect(await toWebpDataUri(broken, 512)).toBe(broken);
  });
});
