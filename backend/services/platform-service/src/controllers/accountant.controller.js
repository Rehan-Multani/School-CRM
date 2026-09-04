import bcrypt from 'bcryptjs';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { AppError } from '../../../shared/AppError.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { schoolThemeSnapshot } from '../services/school.service.js';
import { collectSchoolUserUploadFiles } from '../middleware/uploadSchoolUser.js';
import { deleteUploadedFile } from '../utils/upload.utils.js';
import { feeService } from '../services/fee.service.js';
import { expenseService } from '../services/expense.service.js';
import { accountantService } from '../services/accountant.service.js';
import { academicService } from '../services/academic.service.js';
import { studentService } from '../services/student.service.js';
import { notificationService } from '../services/notification.service.js';

// ----------------------------------------------------
// Shared scope helpers (mirror hr / library controllers)
// ----------------------------------------------------
export function accountantSchoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub;
}

export function accountantPerformedBy(req) {
  return req.user?.name || req.user?.email || 'Accountant';
}

// ----------------------------------------------------
// Accountant Auth Login
// ----------------------------------------------------
export async function accountantLogin(req, res, next) {
  try {
    const { username, email, password } = req.body || {};
    const identifier = (username || email || '').trim().toLowerCase();
    const rawPassword = (password || '').trim();

    if (!identifier || !rawPassword) {
      throw new AppError('Username/email and password are required', 400);
    }

    const user = await SchoolUser.findOne({
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
      $or: [
        { email: identifier },
        { employeeId: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
      ],
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid username or password', 401);
    }

    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(rawPassword, user.passwordHash);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      throw new AppError('Invalid username or password', 401);
    }

    let school = null;
    if (user.schoolId) {
      school = await School.findById(user.schoolId);
    }

    const schoolIdStr = user.schoolId ? user.schoolId.toString() : school ? school._id.toString() : '';

    const token = signAccessToken(
      {
        sub: user._id.toString(),
        userId: user._id.toString(),
        schoolId: schoolIdStr,
        role: 'Accountant',
        name: user.name,
        email: user.email,
        schoolName: school?.name || '',
      },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
    );

    await SchoolUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const publicUser = typeof user.toPublicJSON === 'function' ? user.toPublicJSON() : {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.designation || 'Accountant',
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...publicUser,
        schoolName: school?.name || '',
        academicSession: school?.academicSession || '',
        ...schoolThemeSnapshot(school),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Accountant Profile (personal details)
// ----------------------------------------------------
export async function getAccountantProfile(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      const school = await School.findById(accountantSchoolId(req));
      if (!school) throw new AppError('School not found', 404);
      return res.json({
        user: {
          id: school._id.toString(),
          name: school.admin?.name || 'School Admin',
          email: school.admin?.email || '',
          role: 'Accountant',
          schoolName: school.name || '',
          ...schoolThemeSnapshot(school),
        },
      });
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' });
    if (!user) throw new AppError('Accountant profile not found', 404);
    const profileSchool = user.schoolId ? await School.findById(user.schoolId) : null;
    res.json({ user: { ...user.toPublicJSON(), ...schoolThemeSnapshot(profileSchool) } });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountantProfile(req, res, next) {
  const uploadFiles = collectSchoolUserUploadFiles(req);
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      throw new AppError('School Admin account details are managed under School Config, not here', 400);
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' });
    if (!user) throw new AppError('Accountant profile not found', 404);

    const allowed = ['firstName', 'lastName', 'phone'];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        user[key] = req.body[key];
      }
    }
    if (req.body?.firstName !== undefined || req.body?.lastName !== undefined) {
      user.name = `${user.firstName} ${user.lastName || ''}`.trim();
    }

    if (uploadFiles.photo) {
      if (user.photo) deleteUploadedFile(user.photo);
      user.photo = uploadFiles.photo;
    } else if (req.body?.removePhoto === true || req.body?.removePhoto === 'true') {
      if (user.photo) deleteUploadedFile(user.photo);
      user.photo = '';
    }

    await user.save();
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    if (uploadFiles.photo) deleteUploadedFile(uploadFiles.photo);
    next(error);
  }
}

export async function changeAccountantPassword(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      throw new AppError('School Admin password is managed under Settings in the School Admin portal', 400);
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }
    if (String(newPassword).length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' }).select('+passwordHash');
    if (!user) throw new AppError('Accountant profile not found', 404);

    const valid = user.passwordHash ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
    if (!valid) throw new AppError('Current password is incorrect', 401);

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// DASHBOARD
// ====================================================================
export async function getAccountantDashboard(req, res, next) {
  try {
    const data = await accountantService.getDashboard(accountantSchoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// REFERENCE DATA (read-only academic + student lookups)
// ====================================================================
export async function listAccountantAcademicYears(req, res, next) {
  try {
    const result = await academicService.listYears(accountantSchoolId(req), { ...req.query, limit: 100 });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listAccountantClasses(req, res, next) {
  try {
    const result = await academicService.listClasses(accountantSchoolId(req), { ...req.query, limit: 100 });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listAccountantSections(req, res, next) {
  try {
    const data = await academicService.listSections(accountantSchoolId(req), req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function searchAccountantStudents(req, res, next) {
  try {
    const data = await studentService.listStudents(accountantSchoolId(req), { status: 'ACTIVE', ...req.query });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAccountantStudent(req, res, next) {
  try {
    const data = await studentService.getStudent(accountantSchoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// FEE COLLECTION
// ====================================================================
export async function getStudentFeeProfile(req, res, next) {
  try {
    const sid = accountantSchoolId(req);
    const studentId = req.params.studentId;
    const [student, assignments, invoices] = await Promise.all([
      studentService.getStudent(sid, studentId),
      feeService.listStudentAssignments(sid, studentId),
      feeService.listInvoices(sid, { studentId, limit: 100 }),
    ]);
    res.json({ success: true, data: { student, assignments, invoices: invoices.data, invoicesPagination: invoices.pagination } });
  } catch (error) {
    next(error);
  }
}

export async function accountantGenerateInvoice(req, res, next) {
  try {
    const data = await feeService.generateInvoice(accountantSchoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Invoice generated' });
  } catch (error) {
    next(error);
  }
}

export async function accountantCollectPayment(req, res, next) {
  try {
    const sid = accountantSchoolId(req);
    const payment = await feeService.payInvoice(sid, req.params.invoiceId, req.body, accountantPerformedBy(req));

    // Fire a school-scoped notification for the collection (best-effort).
    try {
      await notificationService.send(
        {
          title: 'Fee Payment Received',
          message: `Receipt ${payment.receiptNumber}: ₹${payment.amount} collected via ${payment.paymentMethod}.`,
          type: 'FEE_PAYMENT',
          audience: 'SCHOOL',
        },
        req.user?.sub || null,
        { schoolId: sid || '' }
      );
    } catch {
      /* notification failure must not block the receipt */
    }

    res.status(201).json({ success: true, data: payment, message: 'Payment recorded' });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// FEE STRUCTURE (read-only for accountant)
// ====================================================================
export async function listAccountantFeeStructures(req, res, next) {
  try {
    const result = await feeService.listStructures(accountantSchoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAccountantFeeStructure(req, res, next) {
  try {
    const data = await feeService.getStructure(accountantSchoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// INSTALLMENTS
// ====================================================================
export async function listAccountantInstallments(req, res, next) {
  try {
    const result = await accountantService.listInstallments(accountantSchoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// DUES / PENDING FEES
// ====================================================================
export async function listAccountantDues(req, res, next) {
  try {
    const result = await accountantService.listDues(accountantSchoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAccountantStudentDueHistory(req, res, next) {
  try {
    const data = await accountantService.studentDueHistory(accountantSchoolId(req), req.params.studentId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// EXPENSES
// ====================================================================
export async function listAccountantExpenses(req, res, next) {
  try {
    const result = await expenseService.listExpenses(accountantSchoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAccountantExpense(req, res, next) {
  try {
    const data = await expenseService.getExpense(accountantSchoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createAccountantExpense(req, res, next) {
  try {
    const data = await expenseService.createExpense(accountantSchoolId(req), req.body, accountantPerformedBy(req));
    res.status(201).json({ success: true, data, message: 'Expense recorded' });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountantExpense(req, res, next) {
  try {
    const data = await expenseService.updateExpense(accountantSchoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Expense updated' });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountantExpenseStatus(req, res, next) {
  try {
    const data = await expenseService.updateStatus(
      accountantSchoolId(req),
      req.params.id,
      req.body,
      accountantPerformedBy(req)
    );
    res.json({ success: true, data, message: 'Expense status updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccountantExpense(req, res, next) {
  try {
    const result = await expenseService.deleteExpense(accountantSchoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listAccountantExpenseCategories(req, res, next) {
  try {
    const data = await expenseService.listCategories(accountantSchoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// RECEIPTS / INVOICES
// ====================================================================
export async function listAccountantReceipts(req, res, next) {
  try {
    const result = await accountantService.listReceipts(accountantSchoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAccountantReceipt(req, res, next) {
  try {
    const data = await accountantService.getReceipt(accountantSchoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function listAccountantInvoices(req, res, next) {
  try {
    const result = await accountantService.listInvoicesView(accountantSchoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAccountantInvoice(req, res, next) {
  try {
    const data = await feeService.getInvoice(accountantSchoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// TRANSACTIONS
// ====================================================================
export async function listAccountantTransactions(req, res, next) {
  try {
    const result = await accountantService.listTransactions(accountantSchoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAccountantTransaction(req, res, next) {
  try {
    const data = await accountantService.getTransaction(
      accountantSchoolId(req),
      req.params.id,
      (req.query.type || 'FEE_PAYMENT').toUpperCase()
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// NOTIFICATIONS
// ====================================================================
export async function listAccountantNotifications(req, res, next) {
  try {
    const data = await notificationService.listForSchool(accountantSchoolId(req) || '');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// REPORTS
// ====================================================================
export async function getAccountantReport(req, res, next) {
  try {
    const data = await accountantService.report(accountantSchoolId(req), req.params.category, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ====================================================================
// SETTINGS
// ====================================================================
export async function getAccountantSettings(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      return res.json({ success: true, data: { preferences: {}, profile: null } });
    }
    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' });
    if (!user) throw new AppError('Accountant profile not found', 404);
    res.json({
      success: true,
      data: {
        profile: user.toPublicJSON(),
        preferences: user.preferences || {},
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountantSettings(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      throw new AppError('School Admin settings are managed in the School Admin portal', 400);
    }
    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' });
    if (!user) throw new AppError('Accountant profile not found', 404);

    const incoming = req.body?.preferences || req.body || {};
    user.preferences = { ...(user.preferences || {}), ...incoming };
    user.markModified('preferences');
    await user.save();
    res.json({ success: true, data: { preferences: user.preferences }, message: 'Settings saved' });
  } catch (error) {
    next(error);
  }
}
