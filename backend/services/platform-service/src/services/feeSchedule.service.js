import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { feeRepository } from '../repositories/fee.repository.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeeSettings, LATE_FEE_TYPES } from '../models/FeeSettings.js';
import { StudentFeeAssignment } from '../models/StudentFeeAssignment.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { School } from '../models/School.js';

/**
 * Fee schedule (installments), late fees / OVERDUE, and the transport/hostel
 * fee components that ride into invoices.
 *
 * Semantics of a structure item's `frequency`: `amount` is PER PERIOD.
 *   MONTHLY     → billed every month of the academic year
 *   QUARTERLY   → every 3 months from the year start
 *   HALF_YEARLY → every 6 months
 *   YEARLY / ONE_TIME → once, at the year start
 * Transport / hostel yearly fees are YEARLY components.
 */

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BILLABLE = ['ACTIVE', 'PENDING', 'PARTIAL'];
const OPEN = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'];
const LATE_FEE_HEAD = 'Late Fee';

const STEP_MONTHS = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, YEARLY: 0, ONE_TIME: 0 };

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function yearLabel(year) {
  const a = year.startDate.getFullYear();
  const b = year.endDate.getFullYear();
  return year.name || (a === b ? String(a) : `${a}-${String(b).slice(2)}`);
}

/** Periods of a frequency inside the academic year. */
function periodsFor(frequency, year) {
  const step = STEP_MONTHS[frequency] ?? 1;
  const start = new Date(year.startDate.getFullYear(), year.startDate.getMonth(), 1);
  const end = startOfDay(year.endDate);
  if (!step) {
    return [{ key: 'annual', label: `Annual ${yearLabel(year)}`, start, end }];
  }
  const out = [];
  let cursor = start;
  let n = 1;
  while (cursor <= end) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + step, 1);
    const last = new Date(Math.min(next.getTime() - 1, end.getTime()));
    let label;
    if (step === 1) label = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    else if (step === 3) label = `Q${n} ${MONTHS[cursor.getMonth()]}–${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
    else label = `H${n} ${MONTHS[cursor.getMonth()]}–${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
    out.push({ key: `${frequency}-${n}`, label, start: cursor, end: last, index: n });
    cursor = next;
    n += 1;
  }
  return out;
}

async function settingsFor(schoolId) {
  const doc = await FeeSettings.findOne({ schoolId: oid(schoolId) });
  return doc ? doc.toPublicJSON() : { lateFee: { type: 'NONE', amount: 0, graceDays: 0, maxAmount: 0 }, defaultDueDay: 10 };
}

export const feeScheduleService = {
  /* ------------------------------ settings ------------------------------ */
  async getSettings(schoolId) {
    return settingsFor(schoolId);
  },

  async updateSettings(schoolId, payload = {}) {
    const lf = payload.lateFee || {};
    const update = {};
    if (lf.type !== undefined) {
      const t = String(lf.type).toUpperCase();
      if (!LATE_FEE_TYPES.includes(t)) throw new AppError('Late fee type must be NONE, FLAT or PER_DAY', 400);
      update['lateFee.type'] = t;
    }
    for (const k of ['amount', 'graceDays', 'maxAmount']) {
      if (lf[k] !== undefined) {
        const n = Number(lf[k]);
        if (!Number.isFinite(n) || n < 0) throw new AppError(`Late fee ${k} must be a non-negative number`, 400);
        update[`lateFee.${k}`] = k === 'graceDays' ? Math.min(90, Math.floor(n)) : r2(n);
      }
    }
    if (payload.defaultDueDay !== undefined) {
      const d = Number(payload.defaultDueDay);
      if (!Number.isInteger(d) || d < 1 || d > 28) throw new AppError('Default due day must be between 1 and 28', 400);
      update.defaultDueDay = d;
    }
    const doc = await FeeSettings.findOneAndUpdate(
      { schoolId: oid(schoolId) },
      { $set: update, $setOnInsert: { schoolId: oid(schoolId) } },
      { new: true, upsert: true, runValidators: true }
    );
    return doc.toPublicJSON();
  },

  /* ------------------- transport / hostel fee components ------------------- */
  /**
   * Make sure the student carries a fee component for a transport route or a
   * hostel bed. Idempotent per (student, source, sourceRefId). Amount 0 → no row.
   */
  async ensureSourceComponent(schoolIdRaw, { studentId, source, sourceRefId, academicYearId, amount }) {
    const schoolId = String(schoolIdRaw);
    const amt = r2(amount);
    if (!(amt > 0)) return null;
    const existing = await StudentFeeAssignment.findOne({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      source,
      sourceRefId: oid(sourceRefId),
    });
    if (existing) {
      if (existing.status === 'CANCELLED') {
        existing.status = 'ACTIVE';
        await existing.save();
      }
      return existing;
    }
    const code = source === 'TRANSPORT' ? 'TRANSPORT' : 'HOSTEL';
    const headName = source === 'TRANSPORT' ? 'Transport Fee' : 'Hostel & Boarding Fee';
    let head = await feeRepository.findHeadByNameOrCode(schoolId, headName, code);
    if (!head) {
      head = await feeRepository.createHead({
        schoolId,
        name: headName,
        code,
        category: source,
        description: `${source === 'TRANSPORT' ? 'School bus' : 'Hostel'} fee (auto)`,
        status: 'ACTIVE',
      });
    }
    const enrollment = await StudentEnrollment.findOne({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      ...(academicYearId ? { academicYearId: oid(academicYearId) } : {}),
      status: 'ACTIVE',
    }).sort({ createdAt: -1 });
    return StudentFeeAssignment.create({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      enrollmentId: enrollment?._id || null,
      academicYearId: academicYearId ? oid(academicYearId) : enrollment?.academicYearId || null,
      classId: enrollment?.classId || null,
      feeStructureId: null,
      feeHeadId: head._id,
      feeHeadName: head.name,
      originalAmount: amt,
      frequency: 'YEARLY',
      discountType: 'NONE',
      discountValue: 0,
      discountAmount: 0,
      concessionAmount: 0,
      finalAmount: amt,
      isOptedIn: true,
      status: 'ACTIVE',
      source,
      sourceRefId: oid(sourceRefId),
    });
  },

  /** Route discontinued / bed vacated: drop the component if nothing was billed against it. */
  async cancelSourceComponent(schoolIdRaw, { studentId, source, sourceRefId }) {
    const schoolId = String(schoolIdRaw);
    const row = await StudentFeeAssignment.findOne({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      source,
      sourceRefId: oid(sourceRefId),
    });
    if (!row) return null;
    const invoiced = await FeeInvoice.exists({ schoolId: oid(schoolId), 'items.feeAssignmentId': row._id });
    if (!invoiced && !(row.paidAmount > 0)) {
      row.status = 'CANCELLED';
      await row.save();
    }
    return row;
  },

  /* ------------------------------ schedule ------------------------------ */
  /**
   * Create the academic-year invoice schedule for one student: one invoice per
   * period per frequency group. Existing invoices (same periodLabel) are kept,
   * so re-running only fills gaps.
   */
  async generateSchedule(schoolIdRaw, { studentId, academicYearId } = {}) {
    const schoolId = String(schoolIdRaw);
    if (!mongoose.isValidObjectId(String(studentId))) throw new AppError('Student is required', 400);

    const enrollment = await StudentEnrollment.findOne({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      ...(academicYearId ? { academicYearId: oid(academicYearId) } : {}),
      status: 'ACTIVE',
    }).sort({ createdAt: -1 });
    if (!enrollment) throw new AppError('No active enrollment found for this student', 400);
    const year = await AcademicYear.findOne({ _id: enrollment.academicYearId, schoolId: oid(schoolId) });
    if (!year?.startDate || !year?.endDate) throw new AppError('The academic year has no start/end dates', 400);

    let assignments = await StudentFeeAssignment.find({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      $or: [{ enrollmentId: enrollment._id }, { academicYearId: year._id }],
    }).populate('feeStructureItemId', 'dueDay');
    if (assignments.length === 0) {
      // Self-heal like generateInvoice: assign the class structure first.
      const { feeService } = await import('./fee.service.js');
      await feeService.autoAssignStudentFees(schoolId, studentId, {
        enrollmentId: enrollment._id,
        classId: enrollment.classId,
        academicYearId: year._id,
      });
      assignments = await StudentFeeAssignment.find({
        schoolId: oid(schoolId),
        studentId: oid(studentId),
        $or: [{ enrollmentId: enrollment._id }, { academicYearId: year._id }],
      }).populate('feeStructureItemId', 'dueDay');
    }
    const billable = assignments.filter((a) => BILLABLE.includes(a.status) && a.isOptedIn && r2(a.getPayableAmount()) > 0);
    if (billable.length === 0) throw new AppError('No billable fee components are assigned to this student', 400);

    const settings = await settingsFor(schoolId);
    const groups = new Map(); // frequency → assignments
    for (const a of billable) {
      const f = STEP_MONTHS[a.frequency] === undefined ? 'MONTHLY' : a.frequency;
      if (!groups.has(f)) groups.set(f, []);
      groups.get(f).push(a);
    }

    const created = [];
    const skipped = [];
    for (const [frequency, rows] of groups) {
      const periods = periodsFor(frequency, year);
      const dueDay = Math.min(...rows.map((a) => a.feeStructureItemId?.dueDay || settings.defaultDueDay), 28);
      for (const p of periods) {
        let periodLabel = p.label;
        let periodRows = rows;
        const dup = await feeRepository.findInvoiceForPeriod(schoolId, studentId, periodLabel);
        if (dup) {
          // A component added after the schedule was generated (e.g. a bus
          // route assigned mid-year) is billed on a supplementary invoice for
          // the same period instead of being silently skipped.
          const billedIds = new Set((dup.items || []).map((it) => String(it.feeAssignmentId || '')));
          const alreadyElsewhere = await FeeInvoice.find({
            schoolId: oid(schoolId),
            studentId: oid(studentId),
            periodLabel: { $regex: `^${escapeRegex(periodLabel)}` },
          })
            .select('items.feeAssignmentId')
            .lean();
          for (const inv of alreadyElsewhere) for (const it of inv.items || []) billedIds.add(String(it.feeAssignmentId || ''));
          periodRows = rows.filter((a) => !billedIds.has(String(a._id)));
          if (periodRows.length === 0) {
            skipped.push(periodLabel);
            continue;
          }
          periodLabel = `${p.label} · ${periodRows.map((a) => a.feeHeadName || 'Fee').join(', ')}`.slice(0, 150);
        }
        const items = periodRows.map((a) => ({
          feeAssignmentId: a._id,
          feeHeadName: a.feeHeadName || 'Fee Item',
          originalAmount: r2(a.originalAmount || 0),
          discountAmount: r2((a.discountAmount || 0) + (a.concessionAmount || 0)),
          finalAmount: r2(a.getPayableAmount()),
        }));
        const totalAmount = r2(items.reduce((s, it) => s + it.finalAmount, 0));
        const dueDate = new Date(p.start.getFullYear(), p.start.getMonth(), dueDay);
        const invoiceNumber = await feeRepository.getNextInvoiceNumber(schoolId);
        const inv = await feeRepository.createInvoice({
          schoolId: oid(schoolId),
          studentId: oid(studentId),
          enrollmentId: enrollment._id,
          academicYearId: year._id,
          invoiceNumber,
          periodLabel,
          periodStart: p.start,
          periodEnd: p.end,
          dueDate,
          items,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          status: 'PENDING',
          installmentNo: p.index || 1,
          installmentCount: periods.length,
          frequency,
        });
        created.push(inv.toPublicJSON());
      }
    }
    return {
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
      message: created.length
        ? `Generated ${created.length} invoice(s)${skipped.length ? `, ${skipped.length} already existed` : ''}`
        : 'All schedule invoices already exist for this student',
    };
  },

  /* ------------------------- overdue + late fees ------------------------- */
  /**
   * Flip open invoices past dueDate (+grace) to OVERDUE and apply the school's
   * late fee. Idempotent: only the delta between the computed fee and the fee
   * already on the invoice is added, so running it daily is safe.
   */
  async applyLateFees(schoolIdRaw, { today = new Date() } = {}) {
    const schoolId = String(schoolIdRaw);
    const settings = await settingsFor(schoolId);
    const lf = settings.lateFee;
    const day = startOfDay(today);
    const cutoff = new Date(day.getTime() - (lf.graceDays || 0) * 86400000);

    const invoices = await FeeInvoice.find({
      schoolId: oid(schoolId),
      status: { $in: OPEN },
      dueDate: { $lt: cutoff },
    });

    let flipped = 0;
    let charged = 0;
    let chargedAmount = 0;
    for (const inv of invoices) {
      const overdueDays = Math.max(1, Math.floor((day - startOfDay(inv.dueDate)) / 86400000) - (lf.graceDays || 0));
      let fee = 0;
      if (lf.type === 'FLAT') fee = r2(lf.amount);
      else if (lf.type === 'PER_DAY') {
        fee = r2(lf.amount * overdueDays);
        if (lf.maxAmount > 0) fee = Math.min(fee, r2(lf.maxAmount));
      }
      const current = r2(inv.lateFeeAmount || 0);
      const delta = r2(fee - current);
      const update = { $set: { status: 'OVERDUE', overdueDays } };
      if (delta > 0) {
        update.$set.lateFeeAmount = fee;
        update.$inc = { totalAmount: delta, balanceAmount: delta };
        const idx = (inv.items || []).findIndex((it) => it.feeHeadName === LATE_FEE_HEAD);
        if (idx >= 0) {
          update.$set[`items.${idx}.originalAmount`] = fee;
          update.$set[`items.${idx}.finalAmount`] = fee;
        } else {
          update.$push = { items: { feeHeadName: LATE_FEE_HEAD, originalAmount: fee, discountAmount: 0, finalAmount: fee } };
        }
        charged += 1;
        chargedAmount = r2(chargedAmount + delta);
      }
      if (inv.status !== 'OVERDUE') flipped += 1;
      await FeeInvoice.updateOne({ _id: inv._id }, update);
    }
    return { scanned: invoices.length, flipped, charged, chargedAmount, lateFeeType: lf.type };
  },

  /** Cron entry: every school, best effort, one at a time. */
  async runLateFeeJobForAllSchools() {
    const schools = await School.find({}).select('_id').lean();
    const out = { schools: schools.length, flipped: 0, charged: 0 };
    for (const s of schools) {
      try {
        const r = await this.applyLateFees(s._id);
        out.flipped += r.flipped;
        out.charged += r.charged;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[fees] late-fee job failed for school', String(s._id), '-', err?.message || err);
      }
    }
    return out;
  },
};
