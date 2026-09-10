/**
 * Printable invoice document.
 *
 * Razorpay hosts a PDF only for invoices it raised itself (`short_url`). Invoices
 * generated on our side have no such URL, so the document is built here and handed
 * to the browser's print dialog — "Save as PDF" — which keeps the stack free of any
 * PDF dependency. Shared by the subscription detail dialog and the invoice ledger.
 */

function fmt(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function invoiceDocumentHtml(inv, sub) {
  const rows = [
    ['Invoice number', inv.invoiceNumber],
    ['Issued', fmt(inv.issuedAt)],
    ['Due', fmt(inv.dueAt)],
    [
      'Billing period',
      inv.billingPeriodStart && inv.billingPeriodEnd
        ? `${fmt(inv.billingPeriodStart)} — ${fmt(inv.billingPeriodEnd)}`
        : '—',
    ],
    ['Payment reference', inv.paymentReference || inv.razorpayInvoiceId || '—'],
    ['Subscription', sub?.razorpaySubscriptionId || inv.razorpaySubscriptionId || '—'],
  ];

  const subtotal = Number(inv.amount || 0) - Number(inv.tax || 0);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(inv.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; color: #0f172a; font-size: 13px; line-height: 1.5; }
  .sheet { max-width: 720px; margin: 0 auto; padding: 32px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; }
  .brand { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
  .brand span { color: #4f46e5; }
  .doc-type { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
  .amount { font-size: 26px; font-weight: 800; text-align: right; white-space: nowrap; }
  .status { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .status.paid { background: #dcfce7; color: #15803d; }
  .status.due { background: #fef3c7; color: #b45309; }
  .bill-to { margin-top: 24px; }
  .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
  .school { margin-top: 4px; font-size: 15px; font-weight: 700; }
  .code { color: #64748b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 9px 0; border-bottom: 1px solid #e2e8f0; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
  td.num, th.num { text-align: right; }
  .meta { margin-top: 24px; width: 100%; }
  .meta td { border: 0; padding: 3px 0; }
  .meta td:first-child { color: #64748b; width: 42%; }
  .meta td:last-child { font-weight: 600; word-break: break-all; }
  .totals { margin-top: 8px; margin-left: auto; width: 260px; }
  .totals td { border: 0; padding: 4px 0; }
  .totals td:last-child { text-align: right; font-weight: 600; }
  .totals tr.grand td { border-top: 2px solid #0f172a; padding-top: 8px; font-size: 15px; font-weight: 800; }
  footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 12px; color: #94a3b8; font-size: 11px; }
  .bar { position: sticky; top: 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; text-align: right; }
  .bar button { font: inherit; font-weight: 700; background: #4f46e5; color: #fff; border: 0; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
  @media print { .bar { display: none; } .sheet { padding: 0; } }
</style>
</head>
<body>
  <div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="sheet">
    <div class="top">
      <div>
        <div class="brand">School <span>CRM</span></div>
        <div class="doc-type">Subscription invoice</div>
      </div>
      <div>
        <div class="amount">${escapeHtml(inr(inv.amount))}</div>
        <div style="text-align:right"><span class="status ${inv.status === 'Paid' ? 'paid' : 'due'}">${escapeHtml(inv.status)}</span></div>
      </div>
    </div>

    <div class="bill-to">
      <div class="label">Billed to</div>
      <div class="school">${escapeHtml(inv.schoolName || sub?.school?.name || 'School')}</div>
      ${inv.schoolCode ? `<div class="code">${escapeHtml(inv.schoolCode)}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr><th>Description</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${escapeHtml(inv.planName || 'Recurring subscription')}</strong><br />
            <span style="color:#64748b;font-size:12px">${escapeHtml(inv.planType || '')} plan${
              inv.billingPeriodStart && inv.billingPeriodEnd
                ? ` · ${escapeHtml(fmt(inv.billingPeriodStart))} — ${escapeHtml(fmt(inv.billingPeriodEnd))}`
                : ''
            }</span>
          </td>
          <td class="num">${escapeHtml(inr(subtotal))}</td>
        </tr>
      </tbody>
    </table>

    <table class="totals">
      <tr><td>Subtotal</td><td>${escapeHtml(inr(subtotal))}</td></tr>
      ${inv.tax > 0 ? `<tr><td>Tax</td><td>${escapeHtml(inr(inv.tax))}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td>${escapeHtml(inr(inv.amount))}</td></tr>
    </table>

    <table class="meta">
      ${rows.map((r) => `<tr><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join('')}
    </table>

    <footer>Computer-generated invoice · No signature required.</footer>
  </div>
</body>
</html>`;
}

/**
 * Opens the invoice in a new window and raises the print dialog.
 * Returns false when the pop-up was blocked so the caller can notify.
 */
export function openInvoiceDocument(inv, sub) {
  const win = window.open('', '_blank', 'width=900,height=1040');
  if (!win) return false;

  win.document.write(invoiceDocumentHtml(inv, sub));
  win.document.close();
  win.focus();
  // document.write + close usually lands synchronously, but give the styles a
  // tick to apply before the print dialog snapshots the page.
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* the in-page "Print / Save as PDF" button is the fallback */
    }
  }, 250);
  return true;
}
