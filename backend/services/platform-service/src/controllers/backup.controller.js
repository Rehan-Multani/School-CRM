import { backupService } from '../services/backup.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { School } from '../models/School.js';
import { AppError } from '../../../shared/AppError.js';
import { schoolId as tenantSchoolId } from '../utils/tenant.js';

// School Admin: the school id is the account's own id — never taken from the request.
const schoolId = (req) => req.user?.sub;
const who = (req) => req.user?.email || req.user?.name || String(req.user?.sub || '');

export async function schoolBackupSummary(req, res, next) {
  try {
    const data = await backupService.schoolSummary(schoolId(req));
    const school = await School.findById(schoolId(req)).select('settings.principalBackupEnabled').lean();
    res.json({ success: true, data: { ...data, principalAccess: Boolean(school?.settings?.principalBackupEnabled) } });
  } catch (error) {
    next(error);
  }
}

export async function downloadSchoolBackup(req, res, next) {
  try {
    const counts = await backupService.downloadSchoolBackup(res, schoolId(req), { requestedBy: who(req) });
    const records = Object.values(counts).reduce((s, n) => s + n, 0);
    auditLogService.record(req, {
      module: 'BACKUP',
      action: 'DOWNLOAD',
      entityType: 'DatabaseBackup',
      entityId: String(schoolId(req)),
      summary: `Downloaded school data backup (${records} records)`,
    });
  } catch (error) {
    if (res.headersSent) return;
    next(error);
  }
}

export async function fullBackupSummary(req, res, next) {
  try {
    const data = await backupService.fullSummary();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function downloadFullBackup(req, res, next) {
  try {
    await backupService.downloadFullBackup(res, { requestedBy: who(req) });
  } catch (error) {
    if (res.headersSent) return;
    next(error);
  }
}

// School Admin: let this school's Principal see / download the Database Backup.
export async function setPrincipalBackupAccess(req, res, next) {
  try {
    if (typeof req.body?.enabled !== 'boolean') throw new AppError('enabled must be true or false', 400);
    await School.updateOne({ _id: schoolId(req) }, { $set: { 'settings.principalBackupEnabled': req.body.enabled } });
    auditLogService.record(req, {
      module: 'BACKUP',
      action: req.body.enabled ? 'PRINCIPAL_ACCESS_ON' : 'PRINCIPAL_ACCESS_OFF',
      entityType: 'School',
      entityId: String(schoolId(req)),
      summary: `Principal backup access turned ${req.body.enabled ? 'on' : 'off'}`,
    });
    res.json({ success: true, data: { principalAccess: req.body.enabled } });
  } catch (error) {
    next(error);
  }
}

// ---- Principal: only while the School Admin has switched it on ----
const isPrincipalSession = (req) => String(req.user?.role || '').toUpperCase() === 'PRINCIPAL';

async function principalGate(req) {
  const id = tenantSchoolId(req);
  // A School Admin token also passes the route guard; it is never blocked by the toggle.
  if (isPrincipalSession(req)) {
    const school = await School.findById(id).select('settings.principalBackupEnabled').lean();
    if (!school?.settings?.principalBackupEnabled) {
      throw new AppError('Database backup is not enabled for the principal by the school admin', 403, 'BACKUP_NOT_ENABLED');
    }
  }
  return id;
}

export async function principalBackupAccess(req, res, next) {
  try {
    const school = await School.findById(tenantSchoolId(req)).select('settings.principalBackupEnabled').lean();
    res.json({ success: true, data: { enabled: Boolean(school?.settings?.principalBackupEnabled) } });
  } catch (error) {
    next(error);
  }
}

export async function principalBackupSummary(req, res, next) {
  try {
    const id = await principalGate(req);
    res.json({ success: true, data: await backupService.schoolSummary(id) });
  } catch (error) {
    next(error);
  }
}

export async function principalBackupDownload(req, res, next) {
  try {
    const id = await principalGate(req);
    const counts = await backupService.downloadSchoolBackup(res, id, { requestedBy: who(req) });
    const records = Object.values(counts).reduce((s, n) => s + n, 0);
    auditLogService.record(req, {
      module: 'BACKUP',
      action: 'DOWNLOAD',
      entityType: 'DatabaseBackup',
      entityId: String(id),
      summary: `Principal downloaded school data backup (${records} records)`,
    });
  } catch (error) {
    if (res.headersSent) return;
    next(error);
  }
}
