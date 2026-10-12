/**
 * Sample certificate templates - five ready-made designs so the Certificates
 * page is not empty. Each is PUBLISHED, so it can be used straight away.
 *
 *   node src/seedCertificates.js          the default seeded schools
 *   node src/seedCertificates.js --all    every school (except the app demo school)
 *
 * Idempotent: a template is only created when the school has none with that
 * name, so re-running never duplicates or overwrites an edited template.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { School } from './models/School.js';
import { CertificateTemplate } from './models/CertificateTemplate.js';
import { DEFAULT_SCHOOLS } from './seedSchools.js';

const COMMON = {
  textColor: '#1f2937',
  textSize: 'm',
  showLogo: true,
  showSeal: true,
  showQr: true,
  showRecipientBlock: true,
  showWatermark: true,
  secondSignatory: false,
  secondSignatoryLabel: 'Class Teacher',
};

export const SAMPLE_CERTIFICATES = [
  {
    name: 'Academic Excellence Award',
    title: 'Certificate of Achievement',
    type: 'ACHIEVEMENT',
    text:
      'has shown outstanding academic performance and dedication in {{courseName}} during the session {{session}}, and is hereby recognised for this remarkable achievement by {{schoolName}}.',
    applicableTo: 'STUDENT',
    design: {
      ...COMMON,
      preset: 'royal',
      orientation: 'landscape',
      borderStyle: 'ornate',
      primaryColor: '#1e3a8a',
      accentColor: '#c9a227',
      backgroundColor: '#fffdf6',
      titleFont: 'serif',
      nameStyle: 'script',
      secondSignatory: true,
    },
  },
  {
    name: 'Participation Certificate',
    title: 'Certificate of Participation',
    type: 'PARTICIPATION',
    text:
      'has actively participated in {{courseName}} organized by {{schoolName}} and showed great enthusiasm and team spirit during the academic session {{session}}.',
    applicableTo: 'STUDENT',
    design: {
      ...COMMON,
      preset: 'emerald',
      orientation: 'landscape',
      borderStyle: 'double',
      primaryColor: '#065f46',
      accentColor: '#b8860b',
      backgroundColor: '#f7fdf9',
      titleFont: 'serif',
      nameStyle: 'serif',
    },
  },
  {
    name: 'Merit Certificate',
    title: 'Certificate of Merit',
    type: 'MERIT',
    text:
      'of Class {{classSection}} has secured a place of merit in {{courseName}} for the session {{session}}, and has brought pride to {{schoolName}}. We wish {{heShe}} continued success.',
    applicableTo: 'STUDENT',
    design: {
      ...COMMON,
      preset: 'crimson',
      orientation: 'portrait',
      borderStyle: 'classic',
      primaryColor: '#7f1d1d',
      accentColor: '#c9a227',
      backgroundColor: '#fffaf5',
      titleFont: 'script',
      nameStyle: 'script',
    },
  },
  {
    name: 'Sports Champion',
    title: 'Sports Excellence Award',
    type: 'SPORTS',
    text:
      'has displayed exceptional sportsmanship, skill and determination in {{courseName}} held at {{schoolName}}. Awarded on {{issueDate}} in recognition of this victory.',
    applicableTo: 'STUDENT',
    design: {
      ...COMMON,
      preset: 'modern',
      orientation: 'landscape',
      borderStyle: 'modern',
      primaryColor: '#4338ca',
      accentColor: '#06b6d4',
      backgroundColor: '#ffffff',
      titleFont: 'sans',
      nameStyle: 'sans',
      showWatermark: false,
    },
  },
  {
    name: 'Bonafide Certificate',
    title: 'Bonafide Certificate',
    type: 'BONAFIDE',
    text:
      'This is to certify that {{studentName}}, {{sonDaughter}} of {{fatherName}}, is a bonafide student of {{schoolName}}, studying in Class {{classSection}} during the academic session {{session}}. {{heShe}} bears a good moral character. This certificate is issued on request for whatever purpose it may serve.',
    applicableTo: 'STUDENT',
    design: {
      ...COMMON,
      preset: 'minimal',
      orientation: 'portrait',
      borderStyle: 'none',
      primaryColor: '#111827',
      accentColor: '#9ca3af',
      backgroundColor: '#ffffff',
      titleFont: 'sans',
      nameStyle: 'serif',
      showRecipientBlock: false,
      showWatermark: false,
      showSeal: true,
    },
  },
];

export async function seedCertificateTemplates({ all = false } = {}) {
  const filter = all
    ? { schoolId: { $ne: 'app-demo' } }
    : { schoolId: { $in: DEFAULT_SCHOOLS.map((school) => school.schoolId) } };
  const schools = await School.find(filter).select('_id schoolId').lean();

  let created = 0;
  for (const school of schools) {
    for (const sample of SAMPLE_CERTIFICATES) {
      const exists = await CertificateTemplate.exists({ schoolId: school._id, name: sample.name });
      if (exists) continue;
      await CertificateTemplate.create({
        schoolId: school._id,
        ...sample,
        signatoryName: '',
        designation: 'Principal',
        status: 'PUBLISHED',
        createdBy: 'seed',
        updatedBy: 'seed',
      });
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
      const result = await seedCertificateTemplates({ all: process.argv.includes('--all') });
      console.log(`Certificate templates: ${result.created} created across ${result.schools} school(s).`);
    } finally {
      await mongoose.disconnect();
    }
  })().catch((err) => {
    console.error('Certificate seed failed:', err.message);
    process.exitCode = 1;
  });
}
