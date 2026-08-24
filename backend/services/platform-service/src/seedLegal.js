import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { LegalDocument } from './models/LegalDocument.js';
import { DEFAULT_PRIVACY_POLICY, DEFAULT_TERMS_OF_SERVICE } from './legalDefaults.js';

const PLATFORM_KEY = 'platform';

const OLD_PLACEHOLDER_PRIVACY =
  'We collect only the school, staff, student, and billing data required to operate this platform. Tenant data is isolated per school. We do not sell personal information to third parties.';

const OLD_PLACEHOLDER_TERMS =
  'By using this platform, schools agree to the subscription plan limits, acceptable-use rules, and payment terms. Super Admin may suspend a tenant for non-payment or policy violations.';

function shouldReplace(existing) {
  if (!existing) return true;

  const privacy = (existing.privacyPolicy || '').trim();
  const terms = (existing.termsOfService || '').trim();
  const seededPrivacy = DEFAULT_PRIVACY_POLICY.trim();
  const seededTerms = DEFAULT_TERMS_OF_SERVICE.trim();

  if (privacy === seededPrivacy && terms === seededTerms) return false;
  if (privacy === OLD_PLACEHOLDER_PRIVACY || terms === OLD_PLACEHOLDER_TERMS) return true;
  if (privacy.length < 400 || terms.length < 400) return true;
  if (!existing.updatedBy || existing.updatedBy === 'seed') return true;
  return false;
}

export async function seedLegalDocuments() {
  const existing = await LegalDocument.findOne({ key: PLATFORM_KEY });

  if (existing && !shouldReplace(existing)) {
    return existing.toPublicJSON();
  }

  const saved = await LegalDocument.findOneAndUpdate(
    { key: PLATFORM_KEY },
    {
      key: PLATFORM_KEY,
      privacyPolicy: DEFAULT_PRIVACY_POLICY.trim(),
      termsOfService: DEFAULT_TERMS_OF_SERVICE.trim(),
      updatedBy: 'seed',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return saved.toPublicJSON();
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedLegal.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedLegalDocuments())
    .then(() => {
      console.log('Legal documents seeded');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Legal seed failed:', error.message);
      process.exit(1);
    });
}
