import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Fee receipt → PDF → system share sheet (WhatsApp, Drive, "Save to Files"…).
// The PDF is rendered on the device from the receipt the server returned; every
// value is HTML-escaped because names/heads are school-entered text.

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

export function receiptHtml({ receipt, school, child, parentName, accent = '#4F46E5' }) {
  const inv = receipt.invoice || {};
  const rows = (inv.items || [])
    .map(
      (it) => `<tr><td>${esc(it.feeHeadName)}${it.discountAmount ? `<div class="sm">Discount ${inr(it.discountAmount)} on ${inr(it.originalAmount)}</div>` : ''}</td>
        <td class="r">${inr(it.finalAmount)}</td></tr>`,
    )
    .join('');
  const cls = [child?.className, child?.sectionName].filter(Boolean).join(' - ');
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { box-sizing: border-box; } body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 28px; font-size: 13px; }
  .head { border-bottom: 3px solid ${accent}; padding-bottom: 14px; margin-bottom: 18px; }
  .school { font-size: 20px; font-weight: 800; color: ${accent}; } .tag { font-size: 12px; color: #64748B; letter-spacing: 1.5px; margin-top: 4px; }
  .grid { display: flex; flex-wrap: wrap; margin-bottom: 14px; } .cell { width: 50%; padding: 5px 0; }
  .k { color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; } .v { font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; } th { text-align: left; font-size: 11px; color: #64748B; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding: 8px 0; }
  td { padding: 9px 0; border-bottom: 1px solid #F1F5F9; vertical-align: top; } .r { text-align: right; } .sm { font-size: 11px; color: #64748B; }
  .paid { margin-top: 16px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
  .paid .a { font-size: 22px; font-weight: 800; color: #16A34A; } .tot td { border: 0; padding: 5px 0; } .tot .b td { font-weight: 800; }
  .foot { margin-top: 26px; color: #64748B; font-size: 11px; text-align: center; }
</style></head><body>
  <div class="head"><div class="school">${esc(school?.name || 'School')}</div><div class="tag">FEE PAYMENT RECEIPT</div></div>
  <div class="grid">
    <div class="cell"><div class="k">Receipt no.</div><div class="v">${esc(receipt.receiptNumber || '—')}</div></div>
    <div class="cell"><div class="k">Payment date</div><div class="v">${day(receipt.paymentDate)}</div></div>
    <div class="cell"><div class="k">Student</div><div class="v">${esc(child?.name || '—')}</div></div>
    <div class="cell"><div class="k">Class</div><div class="v">${esc(cls || '—')}${child?.rollNumber ? ` · Roll ${esc(child.rollNumber)}` : ''}</div></div>
    <div class="cell"><div class="k">Admission no.</div><div class="v">${esc(child?.admissionNumber || '—')}</div></div>
    <div class="cell"><div class="k">Paid by</div><div class="v">${esc(parentName || '—')}</div></div>
    <div class="cell"><div class="k">Payment mode</div><div class="v">${esc(String(receipt.paymentMethod || '—').replace(/_/g, ' '))}</div></div>
    <div class="cell"><div class="k">Transaction id</div><div class="v">${esc(receipt.transactionId || '—')}</div></div>
  </div>
  <table><thead><tr><th>${esc(inv.periodLabel || 'Fee')} · ${esc(inv.invoiceNumber || '')}</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="tot">
    <tr><td>Invoice total</td><td class="r">${inr(inv.totalAmount)}</td></tr>
    <tr><td>Paid so far</td><td class="r">${inr(inv.paidAmount)}</td></tr>
    <tr class="b"><td>Balance</td><td class="r">${inr(inv.balanceAmount)}</td></tr>
  </table>
  <div class="paid"><div><div class="k">Amount received</div><div class="sm">${esc(receipt.status || '')}</div></div><div class="a">${inr(receipt.amount)}</div></div>
  <div class="foot">This is a computer-generated receipt and does not need a signature.</div>
</body></html>`;
}

/** Renders the receipt to a PDF file and opens the share sheet. */
export async function shareReceiptPdf(args) {
  const { uri } = await Print.printToFileAsync({ html: receiptHtml(args) });
  if (!(await Sharing.isAvailableAsync())) {
    // No share sheet on this platform — fall back to the system print dialog (can "Save as PDF").
    await Print.printAsync({ html: receiptHtml(args) });
    return;
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Receipt ${args.receipt.receiptNumber || ''}`.trim(),
  });
}
