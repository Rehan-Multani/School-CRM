import { LegalDocument } from '../models/LegalDocument.js';

const PLATFORM_KEY = 'platform';

export class LegalRepository {
  findPlatformDocument() {
    return LegalDocument.findOne({ key: PLATFORM_KEY });
  }

  upsertPlatformDocument({ privacyPolicy, termsOfService, updatedBy }) {
    return LegalDocument.findOneAndUpdate(
      { key: PLATFORM_KEY },
      { privacyPolicy, termsOfService, updatedBy, key: PLATFORM_KEY },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

export const legalRepository = new LegalRepository();
