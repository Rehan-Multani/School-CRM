import crypto from 'crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { AppError } from '../../../shared/AppError.js';
import { SchoolBanner, MAX_BANNERS_PER_SCHOOL, BANNER_AUDIENCES } from '../models/SchoolBanner.js';
import { schoolService } from './school.service.js';

// Wide, phone-friendly size; the originals can be several MB.
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;

const isId = (value) => mongoose.isValidObjectId(String(value || ''));

/* ---------------------------- built-in defaults --------------------------- */

// A school with no active banner of its own still shows these (drawn on the
// fly in the school's own brand color), so the app home is never bare.
const DEFAULT_PREFIX = 'default-';
const DEFAULT_BANNERS = [
  {
    key: 'welcome',
    title: 'Welcome',
    headline: (school) => `Welcome to ${school}`,
    sub: 'Your school, always with you',
  },
  {
    key: 'stay-connected',
    title: 'Stay connected',
    headline: () => 'Stay on top of school life',
    sub: 'Attendance, homework, exams and notices in one place',
  },
  {
    key: 'learn-grow',
    title: 'Learn and grow',
    headline: () => 'Learn. Grow. Succeed.',
    sub: 'Every day is a new chance to do your best',
  },
];

const DEFAULT_COLOR = '#4F46E5';
const HEX = /^#[0-9a-f]{6}$/i;
const defaultCache = new Map();
const DEFAULT_CACHE_MAX = 60;

const xmlEscape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) =>
    Math.round(((n >> shift) & 255) * (1 - amount))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

function defaultSvg(design, schoolName, color) {
  const headline = design.headline(schoolName);
  // Long school names get a smaller headline so they still fit on one line.
  const size = headline.length > 34 ? 46 : headline.length > 24 ? 56 : 66;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="${darken(color, 0.5)}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="600" fill="url(#bg)"/>
  <circle cx="1060" cy="70" r="190" fill="#ffffff" fill-opacity="0.10"/>
  <circle cx="1130" cy="520" r="140" fill="#ffffff" fill-opacity="0.12"/>
  <circle cx="820" cy="620" r="110" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="90" cy="-20" r="150" fill="#ffffff" fill-opacity="0.07"/>
  <rect x="70" y="235" width="96" height="10" rx="5" fill="#ffffff" fill-opacity="0.9"/>
  <text x="70" y="335" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="#ffffff">${xmlEscape(headline)}</text>
  <text x="70" y="400" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#ffffff" fill-opacity="0.92">${xmlEscape(design.sub)}</text>
</svg>`;
}

async function renderDefault(design, schoolName, color) {
  const key = `${design.key}|${schoolName}|${color}`;
  let asset = defaultCache.get(key);
  if (!asset) {
    const buffer = await sharp(Buffer.from(defaultSvg(design, schoolName, color))).webp({ quality: 82 }).toBuffer();
    asset = { buffer, version: crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 12) };
    if (defaultCache.size >= DEFAULT_CACHE_MAX) defaultCache.delete(defaultCache.keys().next().value);
    defaultCache.set(key, asset);
  }
  return asset;
}

const brandColor = (school) => {
  const color = school?.settings?.primaryColor;
  return typeof color === 'string' && HEX.test(color) ? color : DEFAULT_COLOR;
};

function cleanLink(value) {
  const link = typeof value === 'string' ? value.trim() : '';
  if (!link) return '';
  if (!/^https?:\/\/[^\s]+$/i.test(link)) {
    throw new AppError('Link must start with http:// or https://', 400);
  }
  return link.slice(0, 500);
}

// Array or comma separated string -> a non-empty list of known audiences.
function cleanAudience(value) {
  const list = (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((item) => String(item).trim().toUpperCase())
    .filter((item) => BANNER_AUDIENCES.includes(item));
  const unique = [...new Set(list)];
  if (!unique.length) throw new AppError('Choose at least one app to show this banner in', 400);
  return unique;
}

function cleanTitle(value) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

class SchoolBannerService {
  /* ----------------------------- school admin ---------------------------- */

  async list(schoolId) {
    const banners = await SchoolBanner.find({ schoolId }).sort({ order: 1, createdAt: 1 });
    return banners.map((banner) => ({ ...banner.toPublicJSON(), imageUrl: this.imagePath(schoolId, banner) }));
  }

  // Relative link; clients prefix their own platform base URL.
  imagePath(schoolId, banner) {
    return `/school-theme/${schoolId}/banners/${banner._id}/image?v=${banner.version}`;
  }

  async create(schoolId, { file, title, link, isActive, audience }, actor) {
    if (!file?.buffer?.length) throw new AppError('Choose an image for the banner', 400);
    const count = await SchoolBanner.countDocuments({ schoolId });
    if (count >= MAX_BANNERS_PER_SCHOOL) {
      throw new AppError(`You can keep up to ${MAX_BANNERS_PER_SCHOOL} banners. Delete one to add another.`, 400);
    }

    let processed;
    try {
      processed = await sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new AppError('Please upload a valid image (JPG, PNG or WEBP)', 400);
    }

    const last = await SchoolBanner.findOne({ schoolId }).sort({ order: -1 }).select('order').lean();
    const banner = await SchoolBanner.create({
      schoolId,
      title: cleanTitle(title),
      link: cleanLink(link),
      audience: audience === undefined || audience === '' ? [...BANNER_AUDIENCES] : cleanAudience(audience),
      image: processed.data,
      contentType: 'image/webp',
      width: processed.info.width,
      height: processed.info.height,
      version: crypto.createHash('sha1').update(processed.data).digest('hex').slice(0, 12),
      order: (last?.order ?? -1) + 1,
      isActive: isActive === undefined ? true : isActive === true || isActive === 'true',
      createdBy: actor,
    });
    return { ...banner.toPublicJSON(), imageUrl: this.imagePath(schoolId, banner) };
  }

  async update(schoolId, id, payload = {}) {
    if (!isId(id)) throw new AppError('Banner not found', 404);
    const banner = await SchoolBanner.findOne({ _id: id, schoolId });
    if (!banner) throw new AppError('Banner not found', 404);
    if (payload.title !== undefined) banner.title = cleanTitle(payload.title);
    if (payload.link !== undefined) banner.link = cleanLink(payload.link);
    if (payload.audience !== undefined) banner.audience = cleanAudience(payload.audience);
    if (payload.isActive !== undefined) banner.isActive = payload.isActive === true || payload.isActive === 'true';
    await banner.save();
    return { ...banner.toPublicJSON(), imageUrl: this.imagePath(schoolId, banner) };
  }

  async reorder(schoolId, ids) {
    const list = Array.isArray(ids) ? ids.map(String).filter(isId) : [];
    if (!list.length) throw new AppError('Nothing to reorder', 400);
    await SchoolBanner.bulkWrite(
      list.map((id, index) => ({
        updateOne: { filter: { _id: id, schoolId }, update: { $set: { order: index } } },
      }))
    );
    return this.list(schoolId);
  }

  async remove(schoolId, id) {
    if (!isId(id)) throw new AppError('Banner not found', 404);
    const result = await SchoolBanner.deleteOne({ _id: id, schoolId });
    if (!result.deletedCount) throw new AppError('Banner not found', 404);
    return { id };
  }

  /* ------------------------- public (the mobile apps) -------------------- */

  async publicList(idOrSlug, role) {
    const school = await schoolService.findPublicSchool(idOrSlug, 'schoolId name settings.primaryColor');
    const filter = { schoolId: school._id, isActive: true };
    // An app asks for its own banners; older banners without an audience are for everyone.
    const audience = String(role || '').toUpperCase();
    if (BANNER_AUDIENCES.includes(audience)) {
      filter.$or = [{ audience }, { audience: { $exists: false } }];
    }
    const banners = await SchoolBanner.find(filter).sort({ order: 1, createdAt: 1 }).limit(MAX_BANNERS_PER_SCHOOL);

    // Nothing for this app: show the built-in banners instead.
    if (!banners.length) {
      const color = brandColor(school);
      return Promise.all(
        DEFAULT_BANNERS.map(async (design) => {
          const asset = await renderDefault(design, school.name, color);
          return {
            id: `${DEFAULT_PREFIX}${design.key}`,
            title: '',
            link: '',
            width: 1200,
            height: 600,
            isDefault: true,
            imageUrl: `/school-theme/${school.schoolId}/banners/${DEFAULT_PREFIX}${design.key}/image?v=${asset.version}`,
          };
        })
      );
    }
    return banners.map((banner) => ({
      id: banner._id.toString(),
      title: banner.title || '',
      link: banner.link || '',
      width: banner.width || 0,
      height: banner.height || 0,
      imageUrl: `/school-theme/${school.schoolId}/banners/${banner._id}/image?v=${banner.version}`,
    }));
  }

  async publicImage(idOrSlug, bannerId) {
    if (String(bannerId).startsWith(DEFAULT_PREFIX)) {
      const design = DEFAULT_BANNERS.find((item) => `${DEFAULT_PREFIX}${item.key}` === bannerId);
      if (!design) throw new AppError('Banner not found', 404);
      const school = await schoolService.findPublicSchool(idOrSlug, 'schoolId name settings.primaryColor');
      const asset = await renderDefault(design, school.name, brandColor(school));
      return { buffer: asset.buffer, contentType: 'image/webp', version: asset.version };
    }
    if (!isId(bannerId)) throw new AppError('Banner not found', 404);
    const school = await schoolService.findPublicSchool(idOrSlug, 'schoolId');
    const banner = await SchoolBanner.findOne({ _id: bannerId, schoolId: school._id, isActive: true }).select(
      '+image contentType version'
    );
    if (!banner) throw new AppError('Banner not found', 404);
    return { buffer: banner.image, contentType: banner.contentType || 'image/webp', version: banner.version };
  }
}

export const schoolBannerService = new SchoolBannerService();
