import { AppError } from '../../../shared/AppError.js';
import { legalRepository } from '../repositories/legal.repository.js';
import { DEFAULT_PRIVACY_POLICY, DEFAULT_TERMS_OF_SERVICE } from '../legalDefaults.js';

const MAX_LENGTH = 50000;

function normalizeText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError(`${label} is required`, 400);
  }
  if (text.length > MAX_LENGTH) {
    throw new AppError(`${label} must be ${MAX_LENGTH} characters or fewer`, 400);
  }
  return text;
}

export class LegalService {
  async getDocuments() {
    const existing = await legalRepository.findPlatformDocument();
    if (existing) {
      return existing.toPublicJSON();
    }

    const created = await legalRepository.upsertPlatformDocument({
      privacyPolicy: DEFAULT_PRIVACY_POLICY.trim(),
      termsOfService: DEFAULT_TERMS_OF_SERVICE.trim(),
      updatedBy: 'seed',
    });

    return created.toPublicJSON();
  }

  async updateDocuments({ privacyPolicy, termsOfService, updatedBy }) {
    const document = await legalRepository.upsertPlatformDocument({
      privacyPolicy: normalizeText(privacyPolicy, 'Privacy policy'),
      termsOfService: normalizeText(termsOfService, 'Terms of service'),
      updatedBy: updatedBy || null,
    });

    return document.toPublicJSON();
  }
}

export const legalService = new LegalService();
