import { School } from './models/School.js';
import { CertificateTemplate } from './models/CertificateTemplate.js';
import { certificateService } from './services/certificate.service.js';

/**
 * Gives every school that has never had them the ready-made certificate,
 * timetable and fee-structure designs. Runs at boot; idempotent (a school is only
 * handled once, and templates are matched by name).
 */
export async function seedCertificateTemplates() {
  const schools = await School.find({ 'settings.certificateTemplatesSeeded': { $ne: true } }).select('_id').lean();
  let created = 0;
  for (const school of schools) {
    const result = await certificateService.seedDefaults(school._id, 'System');
    created += result.created;
  }
  await removeSignatureSlots();
  return created;
}

/**
 * Signatures are signed by hand after printing, so designs carry no digital
 * signature image. Earlier seeded designs had an empty signature slot: remove it.
 */
export async function removeSignatureSlots() {
  const rows = await CertificateTemplate.find({ 'design.layout.elements.src': 'SIGNATURE' }).select('design');
  for (const row of rows) {
    const layout = row.design?.layout;
    if (!layout?.elements) continue;
    layout.elements = layout.elements.filter((el) => !(el.type === 'image' && el.src === 'SIGNATURE'));
    row.design = { ...row.design, layout };
    row.markModified('design');
    await row.save();
  }
  return rows.length;
}
