import { platformSettingRepository } from '../repositories/platformSetting.repository.js';

const DEFAULT_TAX_PERCENT = 18;

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Plan override wins; otherwise the platform-wide app-config taxPercent (default 18). */
export async function resolveTaxPercent(plan = null) {
  const override = plan?.taxPercent;
  if (override !== null && override !== undefined && override !== '' && Number.isFinite(Number(override))) {
    return round2(override);
  }
  const settings = await platformSettingRepository.findPlatformSetting();
  const pct = settings?.taxPercent;
  return pct === null || pct === undefined ? DEFAULT_TAX_PERCENT : round2(pct);
}

/** { subtotal, taxPercent, tax, totalAmount } for a pre-tax amount. */
export function applyTax(subtotal, taxPercent) {
  const base = round2(subtotal);
  const pct = round2(taxPercent);
  const tax = round2((base * pct) / 100);
  return { subtotal: base, taxPercent: pct, tax, totalAmount: round2(base + tax) };
}
