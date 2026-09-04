import bcrypt from 'bcryptjs';
import { hrService } from '../services/hr.service.js';
import { staffAttendanceService } from '../services/staffAttendance.service.js';
import { payrollService } from '../services/payroll.service.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { AppError } from '../../../shared/AppError.js';
import { schoolThemeSnapshot } from '../services/school.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub || req.schoolAdmin?.schoolId;
}

function performedBy(req) {
  return req.user?.name || req.user?.email || 'HR Manager';
}

// ----------------------------------------------------
// HR Auth Login
// ----------------------------------------------------
export async function hrLogin(req, res, next) {
  try {
    const { username, email, password } = req.body || {};
    const identifier = (username || email || '').trim().toLowerCase();
    const rawPassword = (password || '').trim();

    if (!identifier || !rawPassword) {
      throw new AppError('Username/email and password are required', 400);
    }

    // Find the HR user by email or employee id. The generic "hr" alias resolves
    // to a real seeded HR account but still requires that account's password.
    let user = await SchoolUser.findOne({
      role: 'HR',
      $or: [{ email: identifier }, { employeeId: new RegExp(`^${identifier}$`, 'i') }],
    }).select('+passwordHash');

    if (!user && (identifier === 'hr' || identifier === 'hr@school.com' || identifier === 'hr-201' || identifier === 'hr201')) {
      user = await SchoolUser.findOne({ role: 'HR', status: 'ACTIVE' }).sort({ createdAt: 1 }).select('+passwordHash');
    }

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid username or password', 401);
    }

    // P0: real bcrypt verification only — no plaintext fallback, no auto-provision.
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(rawPassword, user.passwordHash);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      throw new AppError('Invalid username or password', 401);
    }

    if (user.status && user.status !== 'ACTIVE') {
      throw new AppError('This account is not active. Contact your administrator.', 403);
    }

    // Fetch school info
    let school = null;
    if (user.schoolId) {
      school = await School.findById(user.schoolId);
    }

    const schoolIdStr = user.schoolId ? user.schoolId.toString() : school ? school._id.toString() : '';

    // Sign JWT Token
    const token = signAccessToken(
      {
        sub: user._id.toString(),
        userId: user._id.toString(),
        schoolId: schoolIdStr,
        role: 'HR',
        name: user.name || 'Rohan Verma',
        email: user.email || 'rohan.hr@greenfield.edu',
        schoolName: school?.name || 'Greenfield Public School',
      },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
    );

    // Update lastLoginAt
    await SchoolUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const publicUser = typeof user.toPublicJSON === 'function' ? user.toPublicJSON() : {
      id: user._id.toString(),
      name: user.name || 'Rohan Verma',
      email: user.email,
      role: 'HR & Operations Lead',
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...publicUser,
        schoolName: school?.name || 'Greenfield Public School',
        academicSession: school?.academicSession || '2024-2025',
        ...schoolThemeSnapshot(school),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Dashboard
// ----------------------------------------------------
export async function getHRDashboard(req, res, next) {
  try {
    const data = await hrService.getDashboard(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Employees
// ----------------------------------------------------
export async function listEmployees(req, res, next) {
  try {
    const result = await hrService.listEmployees(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmployee(req, res, next) {
  try {
    const data = await hrService.getEmployee(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

import { collectSchoolUserUploadFiles } from '../middleware/uploadSchoolUser.js';

function parseJsonField(val, fallback = null) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val ?? fallback;
}

export async function createEmployee(req, res, next) {
  try {
    const files = req.files ? collectSchoolUserUploadFiles(req) : {};
    const payload = { ...req.body };
    if (files.photo) payload.photo = files.photo;
    if (files.documents?.length) {
      payload.documents = [...(Array.isArray(payload.documents) ? payload.documents : []), ...files.documents];
    }
    payload.uploadedDocuments = {
      aadhaar: files.aadhaar || [],
      others: files.others || [],
      pan: files.pan || [],
    };
    if (payload.address) payload.address = parseJsonField(payload.address, payload.address);
    if (payload.qualifications) payload.qualifications = parseJsonField(payload.qualifications, payload.qualifications);
    if (payload.bankDetails) payload.bankDetails = parseJsonField(payload.bankDetails, payload.bankDetails);
    if (payload.emergencyContact) payload.emergencyContact = parseJsonField(payload.emergencyContact, payload.emergencyContact);
    if (payload.documentsKeep) payload.documentsKeep = parseJsonField(payload.documentsKeep, null);

    const data = await hrService.createEmployee(schoolId(req), payload);
    res.status(201).json({
      success: true,
      data,
      message: `Employee ${data.name} created successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployee(req, res, next) {
  try {
    const files = req.files ? collectSchoolUserUploadFiles(req) : {};
    const payload = { ...req.body };
    if (files.photo) payload.photo = files.photo;
    if (files.documents?.length) {
      payload.documents = [...(Array.isArray(payload.documents) ? payload.documents : []), ...files.documents];
    }
    payload.uploadedDocuments = {
      aadhaar: files.aadhaar || [],
      others: files.others || [],
      pan: files.pan || [],
    };
    if (payload.address) payload.address = parseJsonField(payload.address, payload.address);
    if (payload.qualifications) payload.qualifications = parseJsonField(payload.qualifications, payload.qualifications);
    if (payload.bankDetails) payload.bankDetails = parseJsonField(payload.bankDetails, payload.bankDetails);
    if (payload.emergencyContact) payload.emergencyContact = parseJsonField(payload.emergencyContact, payload.emergencyContact);
    if (payload.documentsKeep) payload.documentsKeep = parseJsonField(payload.documentsKeep, null);

    const data = await hrService.updateEmployee(schoolId(req), req.params.id, payload);
    res.json({
      success: true,
      data,
      message: `Employee ${data.name} updated successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployeeStatus(req, res, next) {
  try {
    const data = await hrService.updateEmployeeStatus(schoolId(req), req.params.id, req.body.status);
    res.json({
      success: true,
      data,
      message: `Employee status updated to ${data.status}`,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveEmployee(req, res, next) {
  try {
    const data = await hrService.approveEmployee(schoolId(req), req.params.id, req.user);
    res.json({
      success: true,
      data,
      message: `Employee ${data.name} approved and activated successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectEmployee(req, res, next) {
  try {
    const data = await hrService.rejectEmployee(schoolId(req), req.params.id, req.body.reason, req.user);
    res.json({
      success: true,
      data,
      message: `Employee ${data.name} registration was rejected`,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEmployee(req, res, next) {
  try {
    const result = await hrService.deleteEmployee(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Departments
// ----------------------------------------------------
export async function listDepartments(req, res, next) {
  try {
    const data = await hrService.listDepartments(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createDepartment(req, res, next) {
  try {
    const data = await hrService.createDepartment(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      data,
      message: `Department ${data.name} created successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDepartment(req, res, next) {
  try {
    const data = await hrService.updateDepartment(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      data,
      message: `Department ${data.name} updated successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDepartment(req, res, next) {
  try {
    const result = await hrService.deleteDepartment(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Designations
// ----------------------------------------------------
export async function listDesignations(req, res, next) {
  try {
    const data = await hrService.listDesignations(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createDesignation(req, res, next) {
  try {
    const data = await hrService.createDesignation(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      data,
      message: `Designation ${data.title} created successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDesignation(req, res, next) {
  try {
    const data = await hrService.updateDesignation(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      data,
      message: `Designation ${data.title} updated successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDesignation(req, res, next) {
  try {
    const result = await hrService.deleteDesignation(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Attendance (Proxying to staffAttendanceService)
// ----------------------------------------------------
export async function getHRAttendance(req, res, next) {
  try {
    const result = await staffAttendanceService.getDailyAttendance(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.items,
      stats: result.stats,
      date: result.date,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveHRAttendance(req, res, next) {
  try {
    const result = await staffAttendanceService.saveDailyAttendance(schoolId(req), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateSingleAttendance(req, res, next) {
  try {
    const data = await staffAttendanceService.updateSingleStatus(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function markAllHRAttendance(req, res, next) {
  try {
    const result = await staffAttendanceService.markAllStatus(schoolId(req), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getHRMonthlyAttendance(req, res, next) {
  try {
    const result = await staffAttendanceService.getMonthlySummary(schoolId(req), req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getHRAttendanceReport(req, res, next) {
  try {
    const result = await staffAttendanceService.getAttendanceReport(schoolId(req), req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Leave Management
// ----------------------------------------------------
export async function listLeaveRequests(req, res, next) {
  try {
    const result = await hrService.listLeaveRequests(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function createLeaveRequest(req, res, next) {
  try {
    const data = await hrService.createLeaveRequest(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      data,
      message: 'Leave request submitted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function approveLeave(req, res, next) {
  try {
    const data = await hrService.approveLeave(schoolId(req), req.params.id, performedBy(req));
    res.json({
      success: true,
      data,
      message: 'Leave request approved successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectLeave(req, res, next) {
  try {
    const data = await hrService.rejectLeave(schoolId(req), req.params.id, req.body.reason, performedBy(req));
    res.json({
      success: true,
      data,
      message: 'Leave request rejected',
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelLeave(req, res, next) {
  try {
    const data = await hrService.cancelLeave(schoolId(req), req.params.id);
    res.json({
      success: true,
      data,
      message: 'Leave request cancelled',
    });
  } catch (error) {
    next(error);
  }
}

export async function getLeaveBalance(req, res, next) {
  try {
    const data = await hrService.getLeaveBalance(schoolId(req), req.params.empId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Payroll (Proxying to payrollService)
// ----------------------------------------------------
export async function listHRPayrolls(req, res, next) {
  try {
    const result = await payrollService.listPayrolls(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      stats: result.stats,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHREligiblePayrollEmployees(req, res, next) {
  try {
    const data = await payrollService.getEligibleEmployees(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createHRPayroll(req, res, next) {
  try {
    const data = await payrollService.createPayroll(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      data,
      message: `Payroll created for ${data.employeeName} (${data.payrollMonth})`,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHRPayroll(req, res, next) {
  try {
    const data = await payrollService.getPayroll(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateHRPayrollStatus(req, res, next) {
  try {
    const data = await payrollService.updatePayrollStatus(
      schoolId(req),
      req.params.id,
      req.body.status,
      req.body
    );
    res.json({
      success: true,
      data,
      message: `Payroll status updated to ${data.paymentStatus}`,
    });
  } catch (error) {
    next(error);
  }
}

export async function releaseAllHRPayrolls(req, res, next) {
  try {
    const result = await payrollService.releaseAll(schoolId(req), req.body.month);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteHRPayroll(req, res, next) {
  try {
    const result = await payrollService.deletePayroll(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Performance Reviews
// ----------------------------------------------------
export async function listPerformanceReviews(req, res, next) {
  try {
    const result = await hrService.listPerformanceReviews(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPerformanceReview(req, res, next) {
  try {
    const data = await hrService.createPerformanceReview(schoolId(req), {
      ...req.body,
      reviewerName: performedBy(req),
    });
    res.status(201).json({
      success: true,
      data,
      message: 'Performance review submitted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getPerformanceReview(req, res, next) {
  try {
    const data = await hrService.getPerformanceReview(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updatePerformanceReview(req, res, next) {
  try {
    const data = await hrService.updatePerformanceReview(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      data,
      message: 'Performance review updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePerformanceReview(req, res, next) {
  try {
    const result = await hrService.deletePerformanceReview(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Documents
// ----------------------------------------------------
export async function listHRDocuments(req, res, next) {
  try {
    const data = await hrService.listDocuments(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function uploadHRDocument(req, res, next) {
  try {
    const files = req.files ? collectSchoolUserUploadFiles(req) : {};
    let fileUrl = files.documents?.[0] || files.photo || '';
    if (!fileUrl && req.file) {
      fileUrl = `/uploads/users/documents/${req.file.filename}`;
    }

    if (!fileUrl && req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    }

    const data = await hrService.uploadDocument(
      schoolId(req),
      {
        ...req.body,
        verifiedBy: performedBy(req),
      },
      fileUrl
    );

    res.status(201).json({
      success: true,
      data,
      message: `Document "${data.documentName}" uploaded to locker successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyHRDocument(req, res, next) {
  try {
    const data = await hrService.verifyDocument(
      schoolId(req),
      req.params.id,
      req.body.status,
      performedBy(req)
    );
    res.json({
      success: true,
      data,
      message: `Document status updated to ${data.verificationStatus}`,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteHRDocument(req, res, next) {
  try {
    const result = await hrService.deleteDocument(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Settings
// ----------------------------------------------------
export async function getHRSettings(req, res, next) {
  try {
    const data = await hrService.getSettings(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateHRSettings(req, res, next) {
  try {
    const data = await hrService.updateSettings(schoolId(req), req.body);
    res.json({
      success: true,
      data,
      message: 'HR Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Reports
// ----------------------------------------------------
export async function getHRReportData(req, res, next) {
  try {
    const data = await hrService.getReportData(schoolId(req), req.params.category, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Announcements
// ----------------------------------------------------
export async function listAnnouncements(req, res, next) {
  try {
    const data = await hrService.listAnnouncements(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createAnnouncement(req, res, next) {
  try {
    const data = await hrService.createAnnouncement(schoolId(req), req.body, performedBy(req));
    res.status(201).json({
      success: true,
      data,
      message: 'Announcement published successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    const result = await hrService.deleteAnnouncement(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// HR Profile & Password Management
// ----------------------------------------------------
export async function getHRProfile(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      const school = await School.findById(req.user?.sub);
      return res.json({
        success: true,
        user: {
          id: req.user?.sub,
          name: school?.name || 'School Admin',
          email: school?.email || '',
          role: 'HR / School Admin',
          department: 'Human Resources & Administration',
        },
      });
    }

    const user = await SchoolUser.findOne({
      _id: req.user?.sub,
      role: 'HR',
      schoolId: schoolId(req),
    });

    if (!user) {
      throw new AppError('HR profile not found', 404);
    }

    res.json({
      success: true,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateHRProfile(req, res, next) {
  const uploadFiles = req.files ? collectSchoolUserUploadFiles(req) : {};
  try {
    const user = await SchoolUser.findOne({
      _id: req.user?.sub,
      role: 'HR',
      schoolId: schoolId(req),
    });

    if (!user) {
      throw new AppError('HR profile not found', 404);
    }

    const allowed = ['firstName', 'lastName', 'phone'];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        user[key] = req.body[key];
      }
    }
    if (req.body?.firstName !== undefined || req.body?.lastName !== undefined) {
      user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name;
    }

    if (uploadFiles.photo) {
      user.photo = uploadFiles.photo;
    } else if (req.body?.removePhoto === true || req.body?.removePhoto === 'true') {
      user.photo = '';
    }

    await user.save();
    res.json({
      success: true,
      user: user.toPublicJSON(),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function changeHRPassword(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      throw new AppError('School Admin password should be changed in School Admin settings', 400);
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }
    if (String(newPassword).length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    const user = await SchoolUser.findOne({
      _id: req.user?.sub,
      role: 'HR',
      schoolId: schoolId(req),
    }).select('+passwordHash');

    if (!user) {
      throw new AppError('HR profile not found', 404);
    }

    const valid = user.passwordHash ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
    if (!valid) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// HR Notifications (PlatformNotification Backend Integration)
// ----------------------------------------------------
export async function getHRNotifications(req, res, next) {
  try {
    const sId = schoolId(req);
    const userId = req.user?.sub || '';
    const school = await School.findById(sId);

    const notifications = await PlatformNotification.find({
      $and: [
        { $or: [{ schoolId: sId ? sId.toString() : '' }, { schoolId: '' }, { schoolId: null }, ...(school?.schoolId ? [{ schoolId: school.schoolId }] : [])] },
        { audiences: { $in: ['hr', 'staff', 'admin', 'school-admin'] } },
        {
          $or: [
            { recipientRefIds: { $exists: false } },
            { recipientRefIds: { $size: 0 } },
            ...(userId ? [{ recipientRefIds: userId }] : []),
          ],
        },
      ],
    }).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      data: notifications.map((n) => n.toPublicJSON()),
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Official Verified Salary Slip Data
// ----------------------------------------------------
export async function getHRSalarySlip(req, res, next) {
  try {
    const sId = schoolId(req);
    const payroll = await payrollService.getPayroll(sId, req.params.id);
    const school = await School.findById(sId);

    res.json({
      success: true,
      data: {
        ...payroll,
        schoolDetails: {
          name: school?.name || 'School CRM Portal',
          address: school?.address || 'Official Institutional Campus',
          phone: school?.phone || school?.contactNumber || '',
          email: school?.email || '',
          affiliation: school?.board || school?.affiliation || 'Affiliated Educational Institution',
          logo: school?.branding?.logo || school?.logo || '',
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
