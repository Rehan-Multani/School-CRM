import { AppError } from '../../../shared/AppError.js';
import { INVOICE_STATUSES } from '../models/Invoice.js';
import { reportRepository } from '../repositories/report.repository.js';

const SCHOOL_STATUSES = ['Active', 'Inactive', 'Trial', 'Suspended'];

function parseDate(value, label, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${label} is invalid`, 400);
  }
  if (endOfDay && String(value).length <= 10) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

function parseFilters(query = {}, allowedStatuses = SCHOOL_STATUSES) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim() : 'All';
  const plan = typeof query.plan === 'string' ? query.plan.trim() : 'All';

  if (status !== 'All' && allowedStatuses.length && !allowedStatuses.includes(status)) {
    throw new AppError('Status is invalid', 400);
  }

  return {
    search,
    status,
    plan,
    from: parseDate(query.from, 'From date'),
    to: parseDate(query.to, 'To date', true),
    page: query.page,
    limit: query.limit,
  };
}

function monthlyPrice(plan) {
  if (!plan) return 0;
  if (plan.planType === 'Weekly') return Math.round((plan.price * 52) / 12);
  if (plan.planType === 'Yearly') return Math.round(plan.price / 12);
  return plan.price;
}

function countBy(rows, fallback = 'Unknown') {
  return rows.map((row) => ({
    name: row._id || fallback,
    count: row.count || 0,
  }));
}

function fillLastTwelveMonths(schoolRows, invoiceRows) {
  const schoolLookup = Object.fromEntries((schoolRows || []).map((row) => [row._id, row.count]));
  const invoiceLookup = Object.fromEntries(
    (invoiceRows || []).map((row) => [row._id, { amount: row.amount || 0, count: row.count || 0 }])
  );
  const months = [];
  const now = new Date();

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const invoice = invoiceLookup[key] || { amount: 0, count: 0 };
    months.push({
      month: date.toLocaleString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      label: date.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      schools: schoolLookup[key] || 0,
      collected: invoice.amount,
      paidInvoices: invoice.count,
    });
  }

  return months;
}

function toSchoolRow(school) {
  const json = school.toPublicJSON();
  return {
    id: json.id,
    name: json.name,
    code: json.code,
    schoolId: json.schoolId,
    type: json.type,
    board: json.board,
    city: json.address?.city || '',
    state: json.address?.state || '',
    status: json.status,
    subscriptionPlan: json.subscriptionPlan || '',
    studentsCount: json.stats?.studentsCount || 0,
    staffCount: json.stats?.staffCount || 0,
    storageUsed: json.stats?.storageUsed || 0,
    createdAt: json.createdAt,
  };
}

function toNotificationRow(item) {
  const json = item.toPublicJSON();
  return {
    id: json.id,
    title: json.title,
    body: json.body,
    audiences: json.audiences,
    schoolId: json.schoolId,
    schoolName: json.schoolName || 'All schools',
    attempted: json.delivery?.attempted || 0,
    success: json.delivery?.success || 0,
    failed: json.delivery?.failed || 0,
    skippedReason: json.delivery?.skippedReason || '',
    createdAt: json.createdAt,
  };
}

function toInvoiceRow(invoice) {
  const json = invoice.toPublicJSON();
  return {
    id: json.id,
    invoiceNumber: json.invoiceNumber,
    schoolName: json.schoolName,
    schoolCode: json.schoolCode,
    planName: json.planName,
    planType: json.planType,
    amount: json.amount,
    currency: json.currency,
    status: json.status,
    issuedAt: json.issuedAt,
    dueAt: json.dueAt,
    paidAt: json.paidAt,
    paymentMethod: json.paymentMethod,
  };
}

function invoiceSummary(rows) {
  const byStatus = Object.fromEntries(
    (rows || []).map((row) => [row._id, { count: row.count || 0, amount: row.amount || 0 }])
  );
  const value = (status) => byStatus[status] || { count: 0, amount: 0 };
  const paid = value('Paid');
  const pending = value('Pending');
  const overdue = value('Overdue');
  const refunded = value('Refunded');
  const failed = value('Failed');
  const cancelled = value('Cancelled');

  return {
    totalCount: (rows || []).reduce((sum, row) => sum + (row.count || 0), 0),
    totalAmount: (rows || []).reduce((sum, row) => sum + (row.amount || 0), 0),
    collectedAmount: paid.amount,
    outstandingAmount: pending.amount + overdue.amount,
    refundedAmount: refunded.amount,
    paid: paid.count,
    pending: pending.count,
    overdue: overdue.count,
    refunded: refunded.count,
    failed: failed.count,
    cancelled: cancelled.count,
    byStatus: [
      { name: 'Paid', count: paid.count, amount: paid.amount },
      { name: 'Pending', count: pending.count, amount: pending.amount },
      { name: 'Overdue', count: overdue.count, amount: overdue.amount },
      { name: 'Refunded', count: refunded.count, amount: refunded.amount },
      { name: 'Failed', count: failed.count, amount: failed.amount },
      { name: 'Cancelled', count: cancelled.count, amount: cancelled.amount },
    ],
  };
}

function paginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export class ReportService {
  async getSummary(query) {
    const filters = parseFilters(query);
    const snapshot = { ...filters, from: null, to: null };
    const dated = { from: filters.from, to: filters.to };
    const growthFrom = new Date();
    growthFrom.setMonth(growthFrom.getMonth() - 11);
    growthFrom.setDate(1);
    growthFrom.setHours(0, 0, 0, 0);

    const [plans, totals, byStatus, byPlan, byBoard, byType, byMonth, billable, recent, notificationTotals, invoiceRows, invoiceMonths] =
      await Promise.all([
        reportRepository.listPlans(),
        reportRepository.schoolTotals(snapshot),
        reportRepository.schoolsByStatus(snapshot),
        reportRepository.schoolsByPlan(snapshot),
        reportRepository.schoolsByBoard(snapshot),
        reportRepository.schoolsByType(snapshot),
        reportRepository.schoolsByMonth(growthFrom),
        reportRepository.billableByPlan(snapshot),
        reportRepository.recentSchools(snapshot),
        reportRepository.notificationTotals(dated),
        reportRepository.invoiceTotals(dated),
        reportRepository.invoicesByMonth(growthFrom),
      ]);

    const planMap = Object.fromEntries(plans.map((plan) => [plan.name, plan.toPublicJSON()]));
    const billableLookup = Object.fromEntries((billable || []).map((row) => [row._id || '', row.count || 0]));
    const occupancyLookup = Object.fromEntries((byPlan || []).map((row) => [row._id || '', row.count || 0]));

    const planBreakdown = plans.map((plan) => {
      const json = plan.toPublicJSON();
      const schoolCount = occupancyLookup[json.name] || 0;
      const billableCount = billableLookup[json.name] || 0;
      const mrr = monthlyPrice(json) * billableCount;
      return {
        id: json.id,
        name: json.name,
        price: json.price,
        planType: json.planType,
        schoolCount,
        billableCount,
        monthlyRevenue: mrr,
        annualRevenue: mrr * 12,
      };
    });

    const unassignedCount = occupancyLookup[''] || 0;
    const estimatedMonthlyRevenue = planBreakdown.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
    const totalsRow = totals[0] || { total: 0, students: 0, staff: 0, storage: 0 };
    const statusLookup = Object.fromEntries((byStatus || []).map((row) => [row._id, row.count || 0]));
    const notificationRow = notificationTotals[0] || { total: 0, attempted: 0, success: 0, failed: 0 };
    const billing = invoiceSummary(invoiceRows);

    return {
      generatedAt: new Date().toISOString(),
      range: {
        from: filters.from ? filters.from.toISOString() : null,
        to: filters.to ? filters.to.toISOString() : null,
      },
      summary: {
        totalSchools: totalsRow.total || 0,
        activeSchools: statusLookup.Active || 0,
        inactiveSchools: statusLookup.Inactive || 0,
        trialSchools: statusLookup.Trial || 0,
        suspendedSchools: statusLookup.Suspended || 0,
        unassignedPlan: unassignedCount,
        totalStudents: totalsRow.students || 0,
        totalStaff: totalsRow.staff || 0,
        storageUsedGb: totalsRow.storage || 0,
        totalPlans: plans.length,
        estimatedMonthlyRevenue,
        estimatedAnnualRevenue: estimatedMonthlyRevenue * 12,
        collectedAmount: billing.collectedAmount,
        outstandingAmount: billing.outstandingAmount,
        notificationsSent: notificationRow.total || 0,
        notificationDevicesReached: notificationRow.success || 0,
      },
      schoolsByStatus: SCHOOL_STATUSES.map((status) => ({
        name: status,
        count: statusLookup[status] || 0,
      })),
      schoolsByPlan: [
        ...planBreakdown.map((plan) => ({ name: plan.name, count: plan.schoolCount })),
        ...(unassignedCount ? [{ name: 'Unassigned', count: unassignedCount }] : []),
      ],
      schoolsByBoard: countBy(byBoard),
      schoolsByType: countBy(byType),
      monthlyGrowth: fillLastTwelveMonths(byMonth, invoiceMonths),
      plans: planBreakdown,
      billing,
      recentSchools: recent.map(toSchoolRow),
      notifications: {
        total: notificationRow.total || 0,
        attempted: notificationRow.attempted || 0,
        success: notificationRow.success || 0,
        failed: notificationRow.failed || 0,
      },
      planCatalog: Object.values(planMap).map((plan) => ({ id: plan.id, name: plan.name })),
    };
  }

  async listSchools(query) {
    const filters = parseFilters(query);
    const { items, total, page, limit } = await reportRepository.listSchools(filters);
    return {
      data: items.map(toSchoolRow),
      pagination: paginationMeta(total, page, limit),
    };
  }

  async listSubscriptions(query) {
    const summary = await this.getSummary(query);
    return {
      plans: summary.plans,
      unassignedCount: summary.summary.unassignedPlan,
      estimatedMonthlyRevenue: summary.summary.estimatedMonthlyRevenue,
      estimatedAnnualRevenue: summary.summary.estimatedAnnualRevenue,
    };
  }

  async listNotifications(query) {
    const filters = parseFilters(query);
    const [{ items, total, page, limit }, totals] = await Promise.all([
      reportRepository.listNotifications(filters),
      reportRepository.notificationTotals(filters),
    ]);
    const stats = totals[0] || { total: 0, attempted: 0, success: 0, failed: 0 };

    return {
      data: items.map(toNotificationRow),
      pagination: paginationMeta(total, page, limit),
      stats: {
        total: stats.total || 0,
        attempted: stats.attempted || 0,
        success: stats.success || 0,
        failed: stats.failed || 0,
      },
    };
  }

  async listInvoices(query) {
    const filters = parseFilters(query, INVOICE_STATUSES);
    const [{ items, total, page, limit }, totals] = await Promise.all([
      reportRepository.listInvoices(filters),
      reportRepository.invoiceTotals(filters),
    ]);

    return {
      data: items.map(toInvoiceRow),
      pagination: paginationMeta(total, page, limit),
      stats: invoiceSummary(totals),
    };
  }
}

export const reportService = new ReportService();
