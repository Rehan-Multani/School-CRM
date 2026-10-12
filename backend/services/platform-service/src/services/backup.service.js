import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { AppError } from '../../../shared/AppError.js';

/**
 * Database backups, streamed as a plain (readable) JSON document:
 *
 *   { "meta": {...}, "collections": { "<name>": [ {...EJSON doc}, ... ], ... },
 *     "counts": { "<name>": n, ... } }
 *
 * Two scopes, deliberately different code paths so a school can never receive
 * another tenant's rows:
 *   - SCHOOL: only documents belonging to one school (`schoolId` — or the
 *     School/Invoice rows that name it), with credential material stripped.
 *   - FULL:   every collection in the database (Super Admin only).
 *
 * Documents are written with canonical Extended JSON so ObjectIds, Dates and
 * numbers survive a round trip. Output is streamed (cursor -> gzip -> response)
 * so a large school never has to fit in memory.
 */

// Collections that never belong in a school's export: ephemeral auth state,
// push tokens, and replay-protection rows.
const SCHOOL_EXCLUDED = new Set([
  'devicetokens',
  'loginotps',
  'passwordresetotps',
  'idempotencykeys',
  'loginascodes',
  'refreshtokens',
  'loginchallenges',
]);

// Credential / session fields stripped from a school's export (any depth).
const SECRET_KEYS = new Set([
  'passwordHash',
  'tokenVersion',
  'otpHash',
  'otpCipher',
  'otpExpiresAt',
  'resetPasswordTokenHash',
  'resetPasswordExpiresAt',
  'resetTokenHash',
  'resetTokenExpiresAt',
  'selectTokenHash',
  'selectTokenExpiresAt',
  'pass', // School.settings.smtp.pass
]);

// Models keyed on something other than `schoolId`.
const FIELD_OVERRIDES = { invoices: 'school' };

const BATCH_SIZE = 500;
const COOLDOWN_MS = 60 * 1000;
const running = new Set();
const lastRun = new Map();

const oid = (id) => new mongoose.Types.ObjectId(String(id));

function stripSecrets(value) {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (!SECRET_KEYS.has(k)) out[k] = stripSecrets(v);
    }
    return out;
  }
  return value;
}

/** Every collection that holds this school's rows, with the filter that selects them. */
function schoolTargets(schoolId) {
  const id = oid(schoolId);
  const idOrString = { $in: [id, String(schoolId)] };
  const targets = [{ name: 'schools', coll: mongoose.model('School').collection, filter: { _id: id } }];
  const seen = new Set(['schools']);

  for (const model of Object.values(mongoose.models)) {
    const name = model.collection.name;
    if (seen.has(name) || SCHOOL_EXCLUDED.has(name)) continue;
    const field = FIELD_OVERRIDES[name] || (model.schema.path('schoolId') ? 'schoolId' : null);
    if (!field) continue;
    seen.add(name);
    targets.push({ name, coll: model.collection, filter: { [field]: idOrString } });
  }
  return targets.sort((a, b) => a.name.localeCompare(b.name));
}

async function fullTargets() {
  const db = mongoose.connection.db;
  const list = await db.listCollections({}, { nameOnly: true }).toArray();
  return list
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'))
    .sort()
    .map((name) => ({ name, coll: db.collection(name), filter: {} }));
}

function claim(key) {
  if (running.has(key)) {
    throw new AppError('A backup is already being prepared. Please wait for it to finish.', 429);
  }
  const wait = (lastRun.get(key) || 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) {
    throw new AppError(`Please wait ${Math.ceil(wait / 1000)}s before taking another backup.`, 429);
  }
  running.add(key);
}

function release(key) {
  running.delete(key);
  lastRun.set(key, Date.now());
}

/** Writes `chunk` and resolves once the stream can take more (backpressure). */
function write(stream, chunk) {
  return new Promise((resolve, reject) => {
    if (stream.destroyed) return reject(new Error('Client disconnected'));
    if (stream.write(chunk)) return resolve();
    const onDrain = () => {
      stream.off('error', onError);
      resolve();
    };
    const onError = (err) => {
      stream.off('drain', onDrain);
      reject(err);
    };
    stream.once('drain', onDrain);
    stream.once('error', onError);
    return undefined;
  });
}

async function streamBackup(res, { targets, meta, redact, filename }) {
  res.status(200);
  // Plain, human-readable JSON (not gzip): it opens in Notepad / VS Code / any browser.
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  const counts = {};

  try {
    await write(res, `{\n  "meta": ${JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')},\n  "collections": {`);
    let firstColl = true;
    for (const { name, coll, filter } of targets) {
      await write(res, `${firstColl ? '' : ','}\n    ${JSON.stringify(name)}: [`);
      firstColl = false;
      let n = 0;
      const cursor = coll.find(filter, { batchSize: BATCH_SIZE });
      for await (const doc of cursor) {
        const out = redact ? stripSecrets(doc) : doc;
        // One record per line; CANONICAL Extended JSON keeps every BSON type, so the file restores exactly
        await write(res, `${n ? ',' : ''}\n      ${EJSON.stringify(out, { relaxed: false })}`);
        n += 1;
      }
      counts[name] = n;
      await write(res, `${n ? '\n    ' : ''}]`);
    }
    await write(res, `\n  },\n  "counts": ${JSON.stringify(counts)}\n}\n`);
    await new Promise((resolve, reject) => {
      res.once('finish', resolve);
      res.once('error', reject);
      res.once('close', resolve);
      res.end();
    });
  } catch (error) {
    // Headers are already out: the only honest signal left is a broken stream.
    res.destroy(error);
    throw error;
  }
  return counts;
}

const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const safe = (s) => String(s || 'school').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40);

class BackupService {
  /** What a school backup contains: collection -> record count (non-empty only). */
  async schoolSummary(schoolId) {
    const targets = schoolTargets(schoolId);
    const rows = await Promise.all(
      targets.map(async ({ name, coll, filter }) => ({
        collection: name,
        count: await coll.countDocuments(filter),
      }))
    );
    const items = rows.filter((r) => r.count > 0);
    return {
      scope: 'SCHOOL',
      collections: items,
      totalCollections: items.length,
      totalRecords: items.reduce((s, r) => s + r.count, 0),
    };
  }

  async fullSummary() {
    const targets = await fullTargets();
    const rows = await Promise.all(
      targets.map(async ({ name, coll }) => ({ collection: name, count: await coll.estimatedDocumentCount() }))
    );
    return {
      scope: 'FULL',
      collections: rows,
      totalCollections: rows.length,
      totalRecords: rows.reduce((s, r) => s + r.count, 0),
    };
  }

  async downloadSchoolBackup(res, schoolId, { requestedBy = '' } = {}) {
    const School = mongoose.model('School');
    const school = await School.findById(schoolId).select('name code schoolId').lean();
    if (!school) throw new AppError('School not found', 404);

    const key = `school:${schoolId}`;
    claim(key);
    try {
      const meta = {
        type: 'SCHOOL_BACKUP',
        version: 1,
        createdAt: new Date().toISOString(),
        schoolId: String(schoolId),
        schoolName: school.name || '',
        requestedBy,
        note: 'Contains only this school\'s data. Passwords, OTPs and session secrets are not included.',
      };
      return await streamBackup(res, {
        targets: schoolTargets(schoolId),
        meta,
        redact: true,
        filename: `school-backup-${safe(school.code || school.name)}-${stamp()}.json`,
      });
    } finally {
      release(key);
    }
  }

  async downloadFullBackup(res, { requestedBy = '' } = {}) {
    const key = 'full';
    claim(key);
    try {
      const meta = {
        type: 'FULL_BACKUP',
        version: 1,
        createdAt: new Date().toISOString(),
        database: mongoose.connection.name,
        requestedBy,
        note: 'Complete database dump (all tenants). Contains credential hashes — store securely.',
      };
      return await streamBackup(res, {
        targets: await fullTargets(),
        meta,
        redact: false,
        filename: `full-backup-${stamp()}.json`,
      });
    } finally {
      release(key);
    }
  }
}

export const backupService = new BackupService();
