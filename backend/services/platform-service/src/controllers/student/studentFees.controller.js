import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentFeeService } from '../../services/studentFee.service.js';

async function loadCtx(req) {
  return studentAccessService.loadContext(req);
}

export async function getFeeSummary(req, res, next) {
  try {
    res.json({ success: true, data: await studentFeeService.summary(await loadCtx(req)) });
  } catch (error) {
    next(error);
  }
}

export async function getPendingFees(req, res, next) {
  try {
    res.json({ success: true, data: await studentFeeService.pendingInvoices(await loadCtx(req)) });
  } catch (error) {
    next(error);
  }
}

export async function listFeeInvoices(req, res, next) {
  try {
    const { data, pagination } = await studentFeeService.listInvoices(await loadCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getFeeInvoice(req, res, next) {
  try {
    res.json({ success: true, data: await studentFeeService.getInvoice(await loadCtx(req), req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function getFeeHistory(req, res, next) {
  try {
    const { data, pagination } = await studentFeeService.history(await loadCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}
