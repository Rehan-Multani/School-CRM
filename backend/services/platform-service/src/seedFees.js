// One-time reseed for the Fee & Finance module: wipes existing fee data for a
// school and rebuilds a realistic dataset (heads -> structure -> items ->
// student assignments -> invoices -> payments) using the actual service/
// repository layer so records match what the running app itself would create.
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';
import { AcademicYear } from './models/AcademicYear.js';
import { SchoolClass } from './models/SchoolClass.js';
import { StudentEnrollment } from './models/StudentEnrollment.js';
import { FeeHead } from './models/FeeHead.js';
import { FeeStructure } from './models/FeeStructure.js';
import { FeeStructureItem } from './models/FeeStructureItem.js';
import { StudentFeeAssignment } from './models/StudentFeeAssignment.js';
import { FeeInvoice } from './models/FeeInvoice.js';
import { FeePayment } from './models/FeePayment.js';
import { feeService } from './services/fee.service.js';
import { feeRepository } from './repositories/fee.repository.js';

const TARGET_SCHOOL_ID = 'greenfield-public-school';

// name/description come from feeService.seedDefaultHeads' own DEFAULT_FEE_HEADS list.
const STRUCTURE_ITEM_PLAN = [
  { code: 'TUITION', amount: 4000, frequency: 'MONTHLY', isOptional: false },
  { code: 'ADMISSION', amount: 12000, frequency: 'ONE_TIME', isOptional: false },
  { code: 'EXAM', amount: 900, frequency: 'QUARTERLY', isOptional: false },
  { code: 'LIBRARY', amount: 600, frequency: 'YEARLY', isOptional: false },
  { code: 'COMPUTER', amount: 350, frequency: 'MONTHLY', isOptional: false },
  { code: 'ACTIVITY', amount: 1500, frequency: 'YEARLY', isOptional: false },
  { code: 'TRANSPORT', amount: 1800, frequency: 'MONTHLY', isOptional: true },
  { code: 'HOSTEL', amount: 7000, frequency: 'MONTHLY', isOptional: true },
];

function d(dateStr) {
  return new Date(dateStr);
}

async function seedFeesForSchool(school) {
  const schoolId = school._id;
  const schoolIdStr = schoolId.toString();

  console.log(`\n--- ${school.name} ---`);

  const classes = await SchoolClass.find({ schoolId, status: 'ACTIVE' });
  if (classes.length === 0) {
    console.log('No classes configured yet — skipping (nothing to build a fee structure against).');
    return;
  }

  // 1. Wipe existing fee/finance data for this school.
  await Promise.all([
    FeeHead.deleteMany({ schoolId }),
    FeeStructure.deleteMany({ schoolId }),
    FeeStructureItem.deleteMany({ schoolId }),
    StudentFeeAssignment.deleteMany({ schoolId }),
    FeeInvoice.deleteMany({ schoolId }),
    FeePayment.deleteMany({ schoolId }),
  ]);
  console.log('Cleared existing FeeHead/FeeStructure/FeeStructureItem/StudentFeeAssignment/FeeInvoice/FeePayment');

  // 2. Fee heads master.
  await feeService.seedDefaultHeads(schoolIdStr);
  const heads = await FeeHead.find({ schoolId });
  const headByCode = Object.fromEntries(heads.map((h) => [h.code, h]));
  console.log(`Fee heads created: ${heads.map((h) => h.code).join(', ')}`);

  // 3. Class fee structure + items, for every active class against its current/latest academic year.
  for (const cls of classes) {
    const year =
      (await AcademicYear.findOne({ schoolId, isCurrent: true })) ||
      (await AcademicYear.findOne({ schoolId, status: 'ACTIVE' }).sort({ startDate: -1 })) ||
      (await AcademicYear.findOne({ schoolId }).sort({ startDate: -1 }));

    if (!year) {
      console.log(`No academic year found for class ${cls.name} — skipping`);
      continue;
    }

    const structure = await feeService.createStructure(schoolIdStr, {
      academicYearId: year._id.toString(),
      classId: cls._id.toString(),
      name: `${cls.name} - ${year.name} Fee Structure`,
      description: `Standard fee configuration for ${cls.name}, academic year ${year.name}`,
      status: 'ACTIVE',
    });

    const itemByCode = {};
    for (const plan of STRUCTURE_ITEM_PLAN) {
      const head = headByCode[plan.code];
      if (!head) continue;
      const item = await feeService.addStructureItem(schoolIdStr, structure.id, {
        feeHeadId: head._id.toString(),
        amount: plan.amount,
        frequency: plan.frequency,
        dueDay: 10,
        isOptional: plan.isOptional,
      });
      itemByCode[plan.code] = item;
    }
    console.log(`Fee structure "${structure.name}" created with ${Object.keys(itemByCode).length} line items`);

    // 4. Assign fees to every actively enrolled student in this class/year.
    const enrollments = await StudentEnrollment.find({
      schoolId,
      classId: cls._id,
      academicYearId: year._id,
      status: 'ACTIVE',
    }).populate('studentId', 'firstName lastName admissionNumber');

    for (const enrollment of enrollments) {
      const student = enrollment.studentId;
      const assignmentByCode = {};

      for (const plan of STRUCTURE_ITEM_PLAN) {
        const item = itemByCode[plan.code];
        const head = headByCode[plan.code];
        if (!item || !head) continue;

        const isOptedIn = plan.code === 'HOSTEL' ? false : true; // demo: opted into transport, not hostel
        let discountType = 'NONE';
        let discountValue = 0;
        let discountAmount = 0;
        if (plan.code === 'TUITION') {
          discountType = 'PERCENTAGE';
          discountValue = 10;
          discountAmount = Math.round((plan.amount * discountValue) / 100);
        }
        const finalAmount = Math.max(0, plan.amount - discountAmount);

        const assignment = await feeRepository.createAssignment({
          schoolId,
          studentId: student._id,
          enrollmentId: enrollment._id,
          feeStructureId: structure.id,
          feeStructureItemId: item.id,
          feeHeadId: head._id,
          feeHeadName: head.name,
          originalAmount: plan.amount,
          frequency: plan.frequency,
          discountType,
          discountValue,
          discountAmount,
          concessionAmount: 0,
          finalAmount,
          isOptedIn,
          status: 'ACTIVE',
          remarks: plan.code === 'TUITION' ? 'Merit scholarship — 10% tuition waiver' : '',
        });
        assignmentByCode[plan.code] = assignment;
      }
      console.log(`Fee assignments created for ${student.firstName} ${student.lastName || ''} (${student.admissionNumber})`);

      await seedInvoicesAndPayments({ schoolId, schoolIdStr, year, student, enrollment, assignmentByCode });
    }
  }
}

function invoiceItem(assignment) {
  return {
    feeAssignmentId: assignment._id,
    feeHeadName: assignment.feeHeadName,
    originalAmount: assignment.originalAmount,
    discountAmount: assignment.discountAmount + assignment.concessionAmount,
    finalAmount: assignment.finalAmount,
  };
}

async function createInvoice({ schoolId, schoolIdStr, student, enrollment, year, periodLabel, periodStart, periodEnd, dueDate, assignments }) {
  const items = assignments.map(invoiceItem);
  const totalAmount = items.reduce((sum, i) => sum + i.finalAmount, 0);
  const invoiceNumber = await feeRepository.getNextInvoiceNumber(schoolIdStr);

  return feeRepository.createInvoice({
    schoolId,
    studentId: student._id,
    enrollmentId: enrollment._id,
    academicYearId: year._id,
    invoiceNumber,
    periodLabel,
    periodStart,
    periodEnd,
    dueDate,
    items,
    totalAmount,
    paidAmount: 0,
    balanceAmount: totalAmount,
    status: 'PENDING',
  });
}

async function recordPayment({ schoolId, schoolIdStr, student, invoice, amount, paymentMethod, paymentDate, remarks, collectedBy }) {
  const receiptNumber = await feeRepository.getNextReceiptNumber(schoolIdStr);
  await feeRepository.createPayment({
    schoolId,
    invoiceId: invoice._id,
    studentId: student._id,
    receiptNumber,
    amount,
    paymentMethod,
    paymentReference: '',
    paymentDate,
    remarks,
    status: 'COMPLETED',
    collectedBy,
  });

  const paidAmount = invoice.paidAmount + amount;
  const balanceAmount = invoice.totalAmount - paidAmount;
  const status = balanceAmount <= 0 ? 'PAID' : 'PARTIALLY_PAID';
  await feeRepository.updateInvoice(schoolId, invoice._id, { paidAmount, balanceAmount, status });
}

async function seedInvoicesAndPayments({ schoolId, schoolIdStr, year, student, enrollment, assignmentByCode }) {
  const { TUITION, ADMISSION, EXAM, LIBRARY, COMPUTER, ACTIVITY, TRANSPORT } = assignmentByCode;

  // 1. Admission + annual charges — settled at enrollment time, fully paid.
  const admissionInvoice = await createInvoice({
    schoolId, schoolIdStr, student, enrollment, year,
    periodLabel: `Admission & Annual Charges (${year.name})`,
    periodStart: d('2026-06-01'),
    periodEnd: d('2027-03-31'),
    dueDate: d('2026-06-15'),
    assignments: [ADMISSION, LIBRARY, ACTIVITY].filter(Boolean),
  });
  await recordPayment({
    schoolId, schoolIdStr, student, invoice: admissionInvoice,
    amount: admissionInvoice.totalAmount, paymentMethod: 'NET_BANKING',
    paymentDate: d('2026-06-12'), remarks: 'Admission dues cleared in full', collectedBy: 'Front Office',
  });

  // 2. June monthly fees — fully paid.
  const juneInvoice = await createInvoice({
    schoolId, schoolIdStr, student, enrollment, year,
    periodLabel: 'Monthly Fees - June 2026',
    periodStart: d('2026-06-01'), periodEnd: d('2026-06-30'), dueDate: d('2026-06-10'),
    assignments: [TUITION, COMPUTER, TRANSPORT].filter(Boolean),
  });
  await recordPayment({
    schoolId, schoolIdStr, student, invoice: juneInvoice,
    amount: juneInvoice.totalAmount, paymentMethod: 'UPI',
    paymentDate: d('2026-06-09'), remarks: '', collectedBy: 'Front Office',
  });

  // 3. July monthly fees — partially paid.
  const julyInvoice = await createInvoice({
    schoolId, schoolIdStr, student, enrollment, year,
    periodLabel: 'Monthly Fees - July 2026',
    periodStart: d('2026-07-01'), periodEnd: d('2026-07-31'), dueDate: d('2026-07-10'),
    assignments: [TUITION, COMPUTER, TRANSPORT].filter(Boolean),
  });
  await recordPayment({
    schoolId, schoolIdStr, student, invoice: julyInvoice,
    amount: 3000, paymentMethod: 'CASH',
    paymentDate: d('2026-07-15'), remarks: 'Partial payment, balance promised next visit', collectedBy: 'Front Office',
  });

  // 4. Term 1 exam fee — unpaid, past due -> overdue.
  const examInvoice = await createInvoice({
    schoolId, schoolIdStr, student, enrollment, year,
    periodLabel: 'Term 1 Examination Fee (Aug-Oct 2026)',
    periodStart: d('2026-08-01'), periodEnd: d('2026-10-31'), dueDate: d('2026-08-15'),
    assignments: [EXAM].filter(Boolean),
  });
  await feeRepository.updateInvoice(schoolId, examInvoice._id, { status: 'OVERDUE' });

  // 5. September monthly fees — current period, still pending.
  await createInvoice({
    schoolId, schoolIdStr, student, enrollment, year,
    periodLabel: 'Monthly Fees - September 2026',
    periodStart: d('2026-09-01'), periodEnd: d('2026-09-30'), dueDate: d('2026-09-10'),
    assignments: [TUITION, COMPUTER, TRANSPORT].filter(Boolean),
  });

  console.log(`Invoices + payments seeded for ${student.firstName} ${student.lastName || ''}: 1 paid (admission), 1 paid (June), 1 partial (July), 1 overdue (exam), 1 pending (September)`);
}

export async function seedFees() {
  const school = await School.findOne({ schoolId: TARGET_SCHOOL_ID });
  if (!school) {
    console.log(`School "${TARGET_SCHOOL_ID}" not found`);
    return;
  }
  await seedFeesForSchool(school);
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedFees.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedFees())
    .then(() => {
      console.log('\nDone.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fee seed failed:', error);
      process.exit(1);
    });
}
