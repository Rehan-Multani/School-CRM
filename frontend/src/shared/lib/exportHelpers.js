export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || !data.length) return;

  // Extract headers
  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val !== null && val !== undefined ? (typeof val === 'object' ? JSON.stringify(val) : val) : '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  // Create blob and trigger download
  // The BOM makes Excel read the file as UTF-8 (otherwise ₹ and Hindi names garble).
  const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// sheets: [{ name: 'Sheet Title', data: [{...}, ...] }, ...]
export const exportToExcel = async (sheets, filename = 'export.xlsx') => {
  const usableSheets = (sheets || []).filter((s) => s?.data?.length);
  if (!usableSheets.length) return;

  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  usableSheets.forEach(({ name, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
  });
  XLSX.writeFile(workbook, filename);
};

export const exportToJSON = (data, filename = 'export.json') => {
  if (!data) return;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// PDF / shared helpers
// ---------------------------------------------------------------------------

const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('en-IN');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// jsPDF's built-in fonts have no rupee sign: it would print as a stray glyph.
const pdfSafe = (value) => cellText(value).replace(/₹/g, 'Rs. ');

/**
 * Plain-object rows -> a downloaded PDF table (A4, landscape when wide).
 *   rows:      [{ Column: value, ... }]  (keys of the first row are the columns)
 *   title:     heading printed above the table
 *   subtitle:  e.g. the active filters / school name; optional
 */
export const exportToPDF = async ({ rows, title = 'Report', subtitle = '', filename = 'export.pdf' }) => {
  if (!rows || !rows.length) return;
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const columns = Object.keys(rows[0]);
  const doc = new JsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfSafe(title), 40, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const stamp = `Generated ${new Date().toLocaleString('en-IN')}  |  ${rows.length} record${rows.length === 1 ? '' : 's'}`;
  doc.text(subtitle ? `${pdfSafe(subtitle)}  |  ${stamp}` : stamp, 40, 58, { maxWidth: pageWidth - 80 });
  doc.setTextColor(0);

  // Right-align number-ish columns so amounts line up.
  const numeric = {};
  columns.forEach((c, i) => {
    const sample = rows.slice(0, 20).map((r) => cellText(r[c]).replace(/[₹,%\s]/g, '')).filter(Boolean);
    if (sample.length && sample.every((s) => /^-?\d+(\.\d+)?$/.test(s))) numeric[i] = { halign: 'right' };
  });

  autoTable(doc, {
    startY: 72,
    head: [columns.map(pdfSafe)],
    body: rows.map((r) => columns.map((c) => pdfSafe(r[c]))),
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: numeric,
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: () => {
      const page = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Page ${page}`, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      doc.setTextColor(0);
    },
  });

  doc.save(filename);
};

/** Strips characters that are illegal / awkward in file names. */
export const safeFileName = (name) =>
  String(name || 'export')
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'export';
