/**
 * Sample app banners - five generated 1200x600 images so the School Admin
 * "App Banners" page (and the Student / Parent / Teacher app home screens)
 * have something to show.
 *
 *   node src/seedBanners.js                        the default seeded schools
 *   node src/seedBanners.js --all                  every school (except the app demo school)
 *   node src/seedBanners.js --school=app-demo      one or more named schools (comma separated schoolIds)
 *
 * Idempotent: a banner is only added when the school has none with that title
 * and has room left (max 10), so re-running never duplicates anything.
 */
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { env } from './config/env.js';
import { School } from './models/School.js';
import { SchoolBanner, MAX_BANNERS_PER_SCHOOL } from './models/SchoolBanner.js';
import { DEFAULT_SCHOOLS } from './seedSchools.js';

const W = 1200;
const H = 600;

const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Each design: two gradient colors + a decorative accent + the two text lines.
const DESIGNS = [
  {
    title: 'Admissions Open',
    headline: 'Admissions Open',
    sub: (school) => `Academic session 2026-27  |  ${school}`,
    from: '#1d4ed8',
    to: '#0ea5e9',
    accent: '#fde047',
    link: '',
  },
  {
    title: 'Annual Day Celebration',
    headline: 'Annual Day Celebration',
    sub: () => 'Join us for music, dance and awards - parents are welcome',
    from: '#7e22ce',
    to: '#ec4899',
    accent: '#fef08a',
    link: '',
  },
  {
    title: 'Sports Week',
    headline: 'Sports Week',
    sub: () => 'Run. Play. Win. Inter-house competitions all week',
    from: '#047857',
    to: '#14b8a6',
    accent: '#fcd34d',
    link: '',
  },
  {
    title: 'Parent-Teacher Meeting',
    headline: 'Parent-Teacher Meeting',
    sub: () => 'Meet your child\'s teachers and review the progress report',
    from: '#c2410c',
    to: '#f59e0b',
    accent: '#ffffff',
    link: '',
  },
  {
    title: 'Welcome Banner',
    headline: 'Welcome Back, Students!',
    sub: (school) => `${school} wishes you a bright and successful year`,
    from: '#0f172a',
    to: '#334155',
    accent: '#fbbf24',
    link: '',
  },
];

function svgFor(design, schoolName) {
  const sub = esc(design.sub(schoolName));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${design.from}"/>
      <stop offset="1" stop-color="${design.to}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1060" cy="70" r="190" fill="#ffffff" fill-opacity="0.10"/>
  <circle cx="1130" cy="520" r="140" fill="#ffffff" fill-opacity="0.12"/>
  <circle cx="820" cy="620" r="110" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="90" cy="-20" r="150" fill="#ffffff" fill-opacity="0.07"/>
  <rect x="70" y="205" width="96" height="10" rx="5" fill="${design.accent}"/>
  <text x="70" y="305" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="700" fill="#ffffff">${esc(design.headline)}</text>
  <text x="70" y="370" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#ffffff" fill-opacity="0.92">${sub}</text>
  <rect x="70" y="425" width="230" height="52" rx="26" fill="${design.accent}"/>
  <text x="185" y="460" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#111827">Know more</text>
</svg>`;
}

export async function renderBanner(design, schoolName) {
  return sharp(Buffer.from(svgFor(design, schoolName)))
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
}

export async function seedBanners({ all = false, schoolIds = [] } = {}) {
  let filter;
  if (schoolIds.length) filter = { schoolId: { $in: schoolIds.map((id) => id.toLowerCase()) } };
  else if (all) filter = { schoolId: { $ne: 'app-demo' } };
  else filter = { schoolId: { $in: DEFAULT_SCHOOLS.map((school) => school.schoolId) } };
  const schools = await School.find(filter).select('_id schoolId name').lean();

  let created = 0;
  for (const school of schools) {
    let count = await SchoolBanner.countDocuments({ schoolId: school._id });
    for (const [index, design] of DESIGNS.entries()) {
      if (count >= MAX_BANNERS_PER_SCHOOL) break;
      const exists = await SchoolBanner.exists({ schoolId: school._id, title: design.title });
      if (exists) continue;
      const { data, info } = await renderBanner(design, school.name);
      await SchoolBanner.create({
        schoolId: school._id,
        title: design.title,
        link: design.link,
        image: data,
        contentType: 'image/webp',
        width: info.width,
        height: info.height,
        version: crypto.createHash('sha1').update(data).digest('hex').slice(0, 12),
        order: count + index,
        isActive: true,
        createdBy: 'seed',
      });
      count += 1;
      created += 1;
    }
  }
  return { schools: schools.length, created };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  (async () => {
    await mongoose.connect(env.mongoUri);
    try {
      const named = process.argv.find((arg) => arg.startsWith('--school='));
      const schoolIds = named ? named.slice('--school='.length).split(',').map((id) => id.trim()).filter(Boolean) : [];
      const result = await seedBanners({ all: process.argv.includes('--all'), schoolIds });
      console.log(`App banners: ${result.created} created across ${result.schools} school(s).`);
    } finally {
      await mongoose.disconnect();
    }
  })().catch((err) => {
    console.error('Banner seed failed:', err.message);
    process.exitCode = 1;
  });
}
