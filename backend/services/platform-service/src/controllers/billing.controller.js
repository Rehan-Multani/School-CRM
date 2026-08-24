import { billingService } from '../services/billing.service.js';

export async function listInvoices(req, res, next) {
  try {
    const result = await billingService.listInvoices({
      search: req.query?.search,
      status: req.query?.status,
      page: req.query?.page,
      limit: req.query?.limit,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvoice(req, res, next) {
  try {
    const data = await billingService.createInvoice(req.body, req.user?.sub || null);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const data = await billingService.getInvoice(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function markInvoicePaid(req, res, next) {
  try {
    const data = await billingService.markPaid(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Invoice marked as paid',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function refundInvoice(req, res, next) {
  try {
    const data = await billingService.refundInvoice(req.params.id);

    res.json({
      success: true,
      message: 'Invoice refunded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelInvoice(req, res, next) {
  try {
    const data = await billingService.cancelInvoice(req.params.id);

    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentGateway(req, res, next) {
  try {
    res.json({ success: true, data: billingService.gatewayStatus() });
  } catch (error) {
    next(error);
  }
}

export async function createRazorpayOrder(req, res, next) {
  try {
    const data = await billingService.createRazorpayOrder(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function verifyRazorpayPayment(req, res, next) {
  try {
    const data = await billingService.verifyRazorpayPayment(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Online payment recorded',
      data,
    });
  } catch (error) {
    next(error);
  }
}
