// Helpers for exporting API data: presentable rows, and every page of a
// server-paginated list. Pairs with ExportMenu / exportHelpers.

// "paymentMethod" -> "Payment Method", "student_name" -> "Student Name"
const headerOf = (key) => {
  let out = '';
  const k = String(key);
  for (let i = 0; i < k.length; i += 1) {
    const ch = k[i];
    const prev = k[i - 1];
    if (ch === '_' || ch === '-') out += ' ';
    else if (prev && ch >= 'A' && ch <= 'Z' && prev >= 'a' && prev <= 'z') out += ` ${ch}`;
    else out += ch;
  }
  const t = out.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const isIsoDate = (v) =>
  typeof v === 'string' &&
  v.length >= 10 &&
  v[4] === '-' &&
  v[7] === '-' &&
  (v.length === 10 || v[10] === 'T') &&
  !Number.isNaN(Date.parse(v));

// Internal reference columns (studentId, invoiceId, _id ...) mean nothing in a sheet.
const isInternalKey = (key) => {
  const k = String(key).toLowerCase();
  if (k === 'id' || k === '_id' || k === '__v') return true;
  return k.length > 2 && k.endsWith('id') && k !== 'paid' && k !== 'valid' && k !== 'void';
};

/**
 * API rows -> spreadsheet-ready rows: internal ids dropped, simple nested
 * objects flattened to their name/label, headers prettified, ISO timestamps
 * shortened to dates.
 */
export const prettyRows = (rows, { drop = [] } = {}) => {
  const dropSet = new Set(drop.map((d) => String(d).toLowerCase()));
  return (rows || []).map((row) => {
    const out = {};
    Object.entries(row || {}).forEach(([key, raw]) => {
      if (isInternalKey(key) || dropSet.has(String(key).toLowerCase())) return;
      let value = raw;
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        value = value.name ?? value.label ?? value.title ?? '';
        if (typeof value === 'object') value = '';
      }
      if (isIsoDate(value)) value = value.slice(0, 10);
      out[headerOf(key)] = value === null || value === undefined ? '' : value;
    });
    return out;
  });
};

/**
 * Pulls every page of a server-paginated list.
 *   fetchPage({ ...params, page, limit }) -> { data: [...], pagination: { totalPages } }
 */
export const fetchAllPages = async (fetchPage, params = {}, { limit = 100, maxPages = 100 } = {}) => {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchPage({ ...params, page, limit });
    const batch = res?.data || [];
    all.push(...batch);
    if (!batch.length || page >= (res?.pagination?.totalPages || 1)) break;
  }
  return all;
};
