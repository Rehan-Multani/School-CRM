import { parentAccessService } from '../../services/parentAccess.service.js';
import { studentFeeService } from '../../services/studentFee.service.js';
import { parentFeePaymentService } from '../../services/parentFeePayment.service.js';
import { auditLogService } from '../../services/auditLog.service.js';

async function childCtx(req) {
  // Fees do not need an enrollment (an inactive/transferred child can still owe).
  return parentAccessService.resolveChild(req, req.params.childId);
}

/* ------------------------------ FEES (read) ------------------------------ */
export async function getSummary(req, res, next) {
  try { res.json({ success: true, data: await studentFeeService.summary(await childCtx(req)) }); } catch (e) { next(e); }
}
export async function getPending(req, res, next) {
  try { res.json({ success: true, data: await studentFeeService.pendingInvoices(await childCtx(req)) }); } catch (e) { next(e); }
}
export async function listInvoices(req, res, next) {
  try {
    const { data, pagination } = await studentFeeService.listInvoices(await childCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}
export async function getInvoice(req, res, next) {
  try { res.json({ success: true, data: await studentFeeService.getInvoice(await childCtx(req), req.params.id) }); } catch (e) { next(e); }
}
export async function getHistory(req, res, next) {
  try {
    const { data, pagination } = await studentFeeService.history(await childCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}

/* --------------------------- PAYMENTS + RECEIPTS --------------------------- */
export async function createPayOrder(req, res, next) {
  try {
    const parentCtx = await parentAccessService.loadContext(req);
    const child = await parentAccessService.resolveChild(req, req.params.childId);
    const data = await parentFeePaymentService.createPayOrder(child, parentCtx, req.params.id, req.body || {});
    auditLogService.record(req, {
      module: 'FEES',
      action: 'PAY_ORDER',
      entityType: 'FeeInvoice',
      entityId: req.params.id,
      summary: `Parent started an online fee payment (order ${data.orderId})`,
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function verifyPayment(req, res, next) {
  try {
    // Ensure the caller is a linked parent even though verification is signature-only.
    await parentAccessService.resolveChild(req, req.params.childId);
    res.json({ success: true, data: parentFeePaymentService.verifyClientCallback(req.body || {}) });
  } catch (e) { next(e); }
}

export async function listReceipts(req, res, next) {
  try {
    const { data, pagination } = await parentFeePaymentService.listReceipts(await childCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}
export async function getReceipt(req, res, next) {
  try { res.json({ success: true, data: await parentFeePaymentService.getReceipt(await childCtx(req), req.params.paymentId) }); } catch (e) { next(e); }
}
