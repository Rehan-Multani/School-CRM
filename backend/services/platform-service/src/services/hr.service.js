import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';
import { hrRepository } from '../repositories/hr.repository.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Teacher } from '../models/Teacher.js';
import { StaffAttendance } from '../models/StaffAttendance.js';
import { Payroll } from '../models/Payroll.js';
import { PlatformNotification } from '../models/PlatformNotification.js';
import { School } from '../models/School.js';
import { EmployeeDocument } from '../models/EmployeeDocument.js';
import { deleteUploadedFile } from '../utils/upload.utils.js';

function normalizeTeacher(teacher) {
  const firstName = teacher.firstName || teacher.name?.split(' ')[0] || '';
  const middleName = teacher.middleName || '';
  const lastName =
    teacher.lastName ||
    (teacher.name?.split(' ').length > 1 ? teacher.name.split(' ').slice(middleName ? 2 : 1).join(' ') : '');
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || teacher.name;

  // Normalize Teacher documents: { pan: [], aadhaar: [], others: [] } -> [{ type, name, url }]
  const docs = [];
  if (teacher.documents && typeof teacher.documents === 'object') {
    (teacher.documents.pan || []).forEach((url, i) => {
      if (url) docs.push({ id: `pan-${i}`, type: 'PAN Card', name: `PAN Document ${i + 1}`, url, uploadedAt: teacher.createdAt });
    });
    (teacher.documents.aadhaar || []).forEach((url, i) => {
      if (url) docs.push({ id: `aadhaar-${i}`, type: 'Aadhaar Card', name: `Aadhaar Document ${i + 1}`, url, uploadedAt: teacher.createdAt });
    });
    (teacher.documents.others || []).forEach((url, i) => {
      if (url) docs.push({ id: `other-${i}`, type: 'Certificate/Other', name: `Other Document ${i + 1}`, url, uploadedAt: teacher.createdAt });
    });
  }

  const qualSummary = teacher.qualifications?.map((q) => q.degree).filter(Boolean).join(', ') || '';

  return {
    id: teacher._id.toString(),
    sourceCollection: 'Teacher',
    sourceId: teacher._id.toString(),
    employeeType: 'TEACHER',
    employeeId: teacher.employeeId || `TCH-${teacher._id.toString().slice(-4).toUpperCase()}`,
    name: fullName,
    firstName,
    lastName,
    email: teacher.email || teacher.account?.loginEmail || '',
    phone: teacher.mobileNumber || teacher.phone || '',
    alternatePhone: teacher.alternateMobile || '',
    gender: teacher.gender || 'MALE',
    dateOfBirth: teacher.dateOfBirth || null,
    bloodGroup: teacher.bloodGroup || '',
    maritalStatus: teacher.maritalStatus || '',
    nationality: teacher.nationality || 'Indian',
    address: teacher.address || { addressLine: '', city: '', state: '', country: 'India', pincode: '' },
    specialization: teacher.specialization || '',
    qualification: qualSummary,
    experienceSummary: teacher.experienceSummary || '',
    employmentType: teacher.employmentType || 'FULL_TIME',
    joiningDate: teacher.joiningDate,
    department: teacher.department || 'Academic',
    departmentId: null,
    designation: teacher.designation || 'Teacher',
    designationId: null,
    basicSalary: teacher.payroll?.basicSalary || 0,
    pan: teacher.payroll?.pan || '',
    uan: teacher.payroll?.uan || '',
    status: teacher.status || 'PENDING_APPROVAL',
    documents: docs,
    photo: teacher.profilePhoto || '',
    qualifications: teacher.qualifications || [],
    experiences: teacher.experiences || [],
    emergencyContact: {
      name: teacher.emergencyContactName || '',
      phone: teacher.emergencyContactNumber || '',
      relationship: teacher.emergencyContactRelationship || '',
    },
    bankDetails: {
      accountName: teacher.payroll?.accountHolderName || fullName,
      accountNumber: teacher.payroll?.accountNumber || '',
      ifscCode: teacher.payroll?.ifsc || '',
      bankName: teacher.payroll?.bankName || '',
      branchName: teacher.payroll?.branch || '',
      accountType: 'SALARY',
    },
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
}

function normalizeSchoolUser(user) {
  // Normalize SchoolUser documents: [String] -> [{ type, name, url }]
  const docs = (user.documents || []).map((url, i) => ({
    id: `doc-${i}`,
    type: 'Identity/Record',
    name: `Document ${i + 1}`,
    url,
    uploadedAt: user.createdAt,
  }));

  return {
    id: user._id.toString(),
    sourceCollection: 'SchoolUser',
    sourceId: user._id.toString(),
    employeeType: user.role === 'TEACHER' ? 'TEACHER' : 'STAFF',
    employeeId: user.employeeId || `EMP-${user._id.toString().slice(-4).toUpperCase()}`,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || '',
    alternatePhone: '',
    gender: user.gender || 'MALE',
    dateOfBirth: user.dateOfBirth || null,
    bloodGroup: user.bloodGroup || '',
    maritalStatus: user.maritalStatus || '',
    nationality: user.nationality || 'Indian',
    address: user.address || { addressLine: '', city: '', state: '', country: 'India', pincode: '' },
    specialization: user.specialization || '',
    qualification: user.qualification || '',
    experienceSummary: user.experienceSummary || '',
    employmentType: user.employmentType || 'FULL_TIME',
    joiningDate: user.joiningDate,
    department: user.department || 'Administration',
    departmentId: null,
    designation: user.designation || user.role,
    designationId: null,
    role: user.role,
    basicSalary: user.basicSalary || 0,
    pan: user.pan || '',
    uan: user.uan || '',
    status: user.status || 'PENDING_APPROVAL',
    documents: docs,
    photo: user.photo || '',
    qualifications: user.qualification ? [{ degree: user.qualification }] : [],
    experiences: user.experienceSummary ? [{ description: user.experienceSummary }] : [],
    emergencyContact: user.emergencyContact || {
      name: '',
      phone: '',
      relationship: '',
    },
    bankDetails: user.bankDetails || {
      accountName: user.name,
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      accountType: 'SALARY',
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

class HRService {
  // ==========================================
  // DASHBOARD
  // ==========================================
  async getDashboard(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const today = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    const [
      staffUsers,
      teachers,
      todayAttendance,
      pendingLeavesCount,
      payrollAgg,
      departments,
      settings,
    ] = await Promise.all([
      SchoolUser.find({ schoolId, role: { $ne: 'SCHOOLADMIN' } }),
      Teacher.find({ schoolId }),
      StaffAttendance.find({ schoolId, date: today }),
      hrRepository.listLeaveRequests(schoolId, { status: 'PENDING', limit: 1 }),
      Payroll.aggregate([
        { $match: { schoolId: sId } },
        {
          $group: {
            _id: '$paymentStatus',
            totalAmount: { $sum: '$netSalary' },
            count: { $sum: 1 },
          },
        },
      ]),
      hrRepository.listDepartments(schoolId),
      hrRepository.getSettings(schoolId),
    ]);

    const totalStaff = staffUsers.length;
    const totalTeachers = teachers.length;
    const totalEmployees = totalStaff + totalTeachers;

    const activeStaff = staffUsers.filter((u) => u.status === 'ACTIVE').length;
    const activeTeachers = teachers.filter((t) => t.status === 'ACTIVE').length;
    const activeEmployees = activeStaff + activeTeachers;

    // Attendance stats for today
    const presentToday = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
    const absentToday = todayAttendance.filter((a) => a.status === 'ABSENT').length;
    const onLeaveToday = todayAttendance.filter((a) => a.status === 'LEAVE').length;

    // Payroll stats
    let totalPayrollPaid = 0;
    let totalPayrollPending = 0;
    payrollAgg.forEach((p) => {
      if (p._id === 'PAID') totalPayrollPaid += p.totalAmount;
      else if (p._id === 'PROCESSED') totalPayrollPending += p.totalAmount;
    });

    // Department Distribution
    const departmentWise = departments.map((d) => ({
      name: d.name,
      employeeCount: d.employeeCount,
    }));

    return {
      summary: {
        totalEmployees,
        activeEmployees,
        teachingStaff: totalTeachers,
        nonTeachingStaff: totalStaff,
        presentToday,
        absentToday,
        onLeaveToday,
        pendingLeaves: pendingLeavesCount.total,
        totalPayrollPaid,
        totalPayrollPending,
      },
      departmentWise,
      workingDays: settings.workingDays,
      shiftTimings: `${settings.shiftStartTime} - ${settings.shiftEndTime}`,
    };
  }

  // ==========================================
  // EMPLOYEES (UNION OF SCHOOLUSER + TEACHER)
  // ==========================================
  async listEmployees(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }
    if (query.department && query.department !== 'ALL') {
      filter.department = new RegExp(`^${escapeRegex(query.department)}$`, 'i');
    }

    const [staffUsers, teachers] = await Promise.all([
      SchoolUser.find({ ...filter, role: { $ne: 'SCHOOLADMIN' } }).sort({ createdAt: -1 }),
      Teacher.find(filter).sort({ createdAt: -1 }),
    ]);

    let merged = [
      ...staffUsers.map(normalizeSchoolUser),
      ...teachers.map(normalizeTeacher),
    ];

    if (query.employeeType && query.employeeType !== 'ALL') {
      merged = merged.filter((e) => e.employeeType === query.employeeType.toUpperCase());
    }

    if (query.search) {
      const q = query.search.trim().toLowerCase();
      merged = merged.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.phone.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q)
      );
    }

    const { page, limit, skip: start } = sanitizePagination({ page: query.page, limit: query.limit });
    const paginated = merged.slice(start, start + limit);

    return {
      items: paginated,
      total: merged.length,
      page,
      limit,
    };
  }

  async getEmployee(schoolId, id) {
    // Check SchoolUser first
    const staff = await SchoolUser.findOne({ schoolId, _id: id });
    if (staff) return normalizeSchoolUser(staff);

    // Check Teacher
    const teacher = await Teacher.findOne({ schoolId, _id: id });
    if (teacher) return normalizeTeacher(teacher);

    throw new AppError('Employee not found', 404);
  }

  async createEmployee(schoolId, payload = {}) {
    const employeeType = (payload.employeeType || 'STAFF').toUpperCase();
    const name = payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim();
    if (!name) throw new AppError('Employee name is required', 400);

    const email = (payload.email || '').trim().toLowerCase();
    if (!email) throw new AppError('Employee email is required', 400);

    const employeeId = (payload.employeeId || `${employeeType === 'TEACHER' ? 'TCH' : 'STF'}-${Date.now().toString().slice(-4)}`).trim();
    const status = (payload.status || 'PENDING_APPROVAL').toUpperCase();

    if (employeeType === 'TEACHER') {
      const existing = await Teacher.findOne({ schoolId, $or: [{ email }, { employeeId }] });
      if (existing) throw new AppError('Teacher with this email or employee ID already exists', 400);

      const teacher = await Teacher.create({
        schoolId,
        employeeId,
        name,
        firstName: payload.firstName || name.split(' ')[0] || '',
        lastName: payload.lastName || name.split(' ').slice(1).join(' ') || '',
        email,
        phone: payload.phone || '',
        mobileNumber: payload.phone || '',
        alternateMobile: payload.alternatePhone || '',
        gender: payload.gender || 'MALE',
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        bloodGroup: payload.bloodGroup || '',
        maritalStatus: payload.maritalStatus || '',
        nationality: payload.nationality || 'Indian',
        address: payload.address || { addressLine: '', city: '', state: '', country: 'India', pincode: '' },
        department: payload.department || 'Academic',
        designation: payload.designation || 'Teacher',
        specialization: payload.specialization || '',
        employmentType: payload.employmentType || 'FULL_TIME',
        experienceSummary: payload.experienceSummary || '',
        qualifications: payload.qualification
          ? [{ degree: payload.qualification, specialization: payload.specialization || '', passingYear: null, institution: '' }]
          : payload.qualifications || [],
        joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : new Date(),
        status,
        profilePhoto: payload.photo || '',
        documents: {
          aadhaar: payload.uploadedDocuments?.aadhaar || [],
          others: payload.uploadedDocuments?.others || [],
          pan: payload.uploadedDocuments?.pan || [],
        },
        emergencyContactName: payload.emergencyContact?.name || payload.emergencyContactName || '',
        emergencyContactNumber: payload.emergencyContact?.phone || payload.emergencyContactNumber || '',
        emergencyContactRelationship: payload.emergencyContact?.relationship || payload.emergencyContactRelationship || '',
        payroll: {
          basicSalary: Number(payload.basicSalary) || 0,
          accountHolderName: payload.bankDetails?.accountName || name,
          accountNumber: payload.bankDetails?.accountNumber || '',
          ifsc: payload.bankDetails?.ifscCode || '',
          bankName: payload.bankDetails?.bankName || '',
          branch: payload.bankDetails?.branchName || '',
          pan: payload.pan || '',
          uan: payload.uan || '',
          salaryType: 'MONTHLY',
        },
        account: {
          createLoginAccount: Boolean(payload.password),
          loginEmail: email,
          accountStatus: status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
        },
      });

      try {
        await PlatformNotification.create({
          schoolId,
          title: 'New Faculty Registered',
          message: `Teacher ${name} registered. Status: ${status === 'ACTIVE' ? 'Active' : 'Pending Admin Approval'}.`,
          type: 'TEACHER',
          read: false,
        });
      } catch {}

      return normalizeTeacher(teacher);
    } else {
      const existing = await SchoolUser.findOne({ schoolId, $or: [{ email }, { employeeId }] });
      if (existing) throw new AppError('Staff with this email or employee ID already exists', 400);

      let passwordHash = '';
      if (payload.password) {
        passwordHash = await bcrypt.hash(payload.password, 10);
      }

      let normalizedRole = (payload.role || 'HR').toUpperCase();
      if (!['TEACHER', 'LIBRARIAN', 'HR', 'ACCOUNTANT', 'TRANSPORT'].includes(normalizedRole)) {
        normalizedRole = 'HR';
      }

      const user = await SchoolUser.create({
        schoolId,
        employeeId,
        name,
        firstName: payload.firstName || name.split(' ')[0] || '',
        lastName: payload.lastName || name.split(' ').slice(1).join(' ') || '',
        email,
        phone: payload.phone || '',
        gender: payload.gender || 'MALE',
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        bloodGroup: payload.bloodGroup || '',
        maritalStatus: payload.maritalStatus || '',
        nationality: payload.nationality || 'Indian',
        address: payload.address || { addressLine: '', city: '', state: '', country: 'India', pincode: '' },
        specialization: payload.specialization || '',
        qualification: payload.qualification || '',
        experienceSummary: payload.experienceSummary || '',
        employmentType: payload.employmentType || 'FULL_TIME',
        department: payload.department || 'Administration',
        designation: payload.designation || 'Staff',
        role: normalizedRole,
        joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : new Date(),
        basicSalary: Number(payload.basicSalary) || 0,
        pan: payload.pan || '',
        uan: payload.uan || '',
        status,
        photo: payload.photo || '',
        documents: [
          ...(Array.isArray(payload.documents) ? payload.documents : []),
          ...(payload.uploadedDocuments?.aadhaar || []),
          ...(payload.uploadedDocuments?.others || []),
        ],
        passwordHash,
        emergencyContact: payload.emergencyContact || {
          name: payload.emergencyContactName || '',
          phone: payload.emergencyContactNumber || '',
          relationship: payload.emergencyContactRelationship || '',
        },
        bankDetails: payload.bankDetails || {},
      });

      try {
        await PlatformNotification.create({
          schoolId,
          title: 'New Staff Member Registered',
          message: `Staff ${name} registered. Status: ${status === 'ACTIVE' ? 'Active' : 'Pending Admin Approval'}.`,
          type: 'STAFF',
          read: false,
        });
      } catch {}

      return normalizeSchoolUser(user);
    }
  }

  async updateEmployee(schoolId, id, payload = {}) {
    const staff = await SchoolUser.findOne({ schoolId, _id: id });
    if (staff) {
      if (payload.name) {
        staff.name = payload.name;
        staff.firstName = payload.firstName || payload.name.split(' ')[0];
        staff.lastName = payload.lastName || payload.name.split(' ').slice(1).join(' ');
      }
      if (payload.email) staff.email = payload.email.toLowerCase();
      if (payload.phone !== undefined) staff.phone = payload.phone;
      if (payload.gender) staff.gender = payload.gender;
      if (payload.dateOfBirth !== undefined) staff.dateOfBirth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : null;
      if (payload.bloodGroup !== undefined) staff.bloodGroup = payload.bloodGroup;
      if (payload.maritalStatus !== undefined) staff.maritalStatus = payload.maritalStatus;
      if (payload.nationality !== undefined) staff.nationality = payload.nationality;
      if (payload.address !== undefined) staff.address = payload.address;
      if (payload.specialization !== undefined) staff.specialization = payload.specialization;
      if (payload.qualification !== undefined) staff.qualification = payload.qualification;
      if (payload.experienceSummary !== undefined) staff.experienceSummary = payload.experienceSummary;
      if (payload.employmentType !== undefined) staff.employmentType = payload.employmentType;
      if (payload.department) staff.department = payload.department;
      if (payload.designation) staff.designation = payload.designation;
      if (payload.basicSalary !== undefined) staff.basicSalary = Number(payload.basicSalary);
      if (payload.pan !== undefined) staff.pan = payload.pan;
      if (payload.uan !== undefined) staff.uan = payload.uan;
      if (payload.status) staff.status = payload.status;
      if (payload.photo !== undefined) staff.photo = payload.photo;
      if (payload.uploadedDocuments?.aadhaar?.length || payload.uploadedDocuments?.others?.length || payload.documentsKeep) {
        const keepDocs = Array.isArray(payload.documentsKeep) ? payload.documentsKeep : (staff.documents || []);
        staff.documents = [
          ...keepDocs,
          ...(payload.uploadedDocuments?.aadhaar || []),
          ...(payload.uploadedDocuments?.others || []),
        ];
      }
      if (payload.bankDetails) staff.bankDetails = payload.bankDetails;
      if (payload.emergencyContact) {
        staff.emergencyContact = {
          name: payload.emergencyContact.name || '',
          phone: payload.emergencyContact.phone || '',
          relationship: payload.emergencyContact.relationship || '',
        };
      }
      if (payload.joiningDate) staff.joiningDate = new Date(payload.joiningDate);
      if (payload.password) staff.passwordHash = await bcrypt.hash(payload.password, 10);

      await staff.save();
      return normalizeSchoolUser(staff);
    }

    const teacher = await Teacher.findOne({ schoolId, _id: id });
    if (teacher) {
      if (payload.name) {
        teacher.name = payload.name;
        teacher.firstName = payload.firstName || payload.name.split(' ')[0];
        teacher.lastName = payload.lastName || payload.name.split(' ').slice(1).join(' ');
      }
      if (payload.email) teacher.email = payload.email.toLowerCase();
      if (payload.phone !== undefined) {
        teacher.phone = payload.phone;
        teacher.mobileNumber = payload.phone;
      }
      if (payload.alternatePhone !== undefined) teacher.alternateMobile = payload.alternatePhone;
      if (payload.gender) teacher.gender = payload.gender;
      if (payload.dateOfBirth !== undefined) teacher.dateOfBirth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : null;
      if (payload.bloodGroup !== undefined) teacher.bloodGroup = payload.bloodGroup;
      if (payload.maritalStatus !== undefined) teacher.maritalStatus = payload.maritalStatus;
      if (payload.nationality !== undefined) teacher.nationality = payload.nationality;
      if (payload.address !== undefined) teacher.address = payload.address;
      if (payload.department) teacher.department = payload.department;
      if (payload.designation) teacher.designation = payload.designation;
      if (payload.specialization !== undefined) teacher.specialization = payload.specialization;
      if (payload.employmentType !== undefined) teacher.employmentType = payload.employmentType;
      if (payload.experienceSummary !== undefined) teacher.experienceSummary = payload.experienceSummary;
      if (payload.status) teacher.status = payload.status;
      if (payload.photo !== undefined) teacher.profilePhoto = payload.photo;
      if (payload.uploadedDocuments || payload.documentsKeep) {
        const keepAadhaar = payload.documentsKeep?.aadhaar || teacher.documents?.aadhaar || [];
        const keepOthers = payload.documentsKeep?.others || teacher.documents?.others || [];
        teacher.documents = {
          aadhaar: [...keepAadhaar, ...(payload.uploadedDocuments?.aadhaar || [])],
          others: [...keepOthers, ...(payload.uploadedDocuments?.others || [])],
          pan: teacher.documents?.pan || [],
        };
      }
      if (payload.emergencyContact) {
        teacher.emergencyContactName = payload.emergencyContact.name || '';
        teacher.emergencyContactNumber = payload.emergencyContact.phone || '';
        teacher.emergencyContactRelationship = payload.emergencyContact.relationship || '';
      }
      if (payload.joiningDate) teacher.joiningDate = new Date(payload.joiningDate);
      if (payload.basicSalary !== undefined || payload.bankDetails || payload.pan !== undefined || payload.uan !== undefined) {
        teacher.payroll = {
          ...teacher.payroll,
          basicSalary: payload.basicSalary !== undefined ? Number(payload.basicSalary) : teacher.payroll?.basicSalary,
          accountHolderName: payload.bankDetails?.accountName || teacher.payroll?.accountHolderName,
          accountNumber: payload.bankDetails?.accountNumber || teacher.payroll?.accountNumber,
          ifsc: payload.bankDetails?.ifscCode || teacher.payroll?.ifsc,
          bankName: payload.bankDetails?.bankName || teacher.payroll?.bankName,
          branch: payload.bankDetails?.branchName || teacher.payroll?.branch,
          pan: payload.pan !== undefined ? payload.pan : teacher.payroll?.pan,
          uan: payload.uan !== undefined ? payload.uan : teacher.payroll?.uan,
        };
      }

      await teacher.save();
      return normalizeTeacher(teacher);
    }

    throw new AppError('Employee not found', 404);
  }

  async updateEmployeeStatus(schoolId, id, status) {
    const validStatus = ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'PENDING', 'REJECTED', 'ON_LEAVE', 'SUSPENDED'];
    if (!validStatus.includes(status.toUpperCase())) {
      throw new AppError('Invalid status', 400);
    }

    const staff = await SchoolUser.findOneAndUpdate(
      { schoolId, _id: id },
      { $set: { status: status.toUpperCase() } },
      { new: true }
    );
    if (staff) return normalizeSchoolUser(staff);

    const teacher = await Teacher.findOneAndUpdate(
      { schoolId, _id: id },
      { $set: { status: status.toUpperCase() } },
      { new: true }
    );
    if (teacher) return normalizeTeacher(teacher);

    throw new AppError('Employee not found', 404);
  }

  async approveEmployee(schoolId, id, reviewer = {}) {
    const staff = await SchoolUser.findOne({ schoolId, _id: id });
    if (staff) {
      staff.status = 'ACTIVE';
      await staff.save();

      try {
        await PlatformNotification.create({
          schoolId,
          title: 'Staff Member Approved',
          message: `${staff.name} (${staff.designation || staff.role}) has been verified & approved by administration.`,
          type: 'STAFF',
          read: false,
        });
      } catch {}

      return normalizeSchoolUser(staff);
    }

    const teacher = await Teacher.findOne({ schoolId, _id: id });
    if (teacher) {
      teacher.status = 'ACTIVE';
      if (teacher.account) {
        teacher.account.accountStatus = 'ACTIVE';
      }
      await teacher.save();

      try {
        await PlatformNotification.create({
          schoolId,
          title: 'Faculty Member Approved',
          message: `Teacher ${teacher.name} (${teacher.department || 'Academic'}) has been verified & approved by administration.`,
          type: 'TEACHER',
          read: false,
        });
      } catch {}

      return normalizeTeacher(teacher);
    }

    throw new AppError('Employee not found', 404);
  }

  async rejectEmployee(schoolId, id, reason = '', reviewer = {}) {
    const staff = await SchoolUser.findOne({ schoolId, _id: id });
    if (staff) {
      staff.status = 'REJECTED';
      await staff.save();

      try {
        await PlatformNotification.create({
          schoolId,
          title: 'Staff Registration Rejected',
          message: `Registration for ${staff.name} was rejected. Reason: ${reason || 'Administrative discretion.'}`,
          type: 'STAFF',
          read: false,
        });
      } catch {}

      return normalizeSchoolUser(staff);
    }

    const teacher = await Teacher.findOne({ schoolId, _id: id });
    if (teacher) {
      teacher.status = 'REJECTED';
      if (teacher.account) {
        teacher.account.accountStatus = 'INACTIVE';
      }
      await teacher.save();

      try {
        await PlatformNotification.create({
          schoolId,
          title: 'Faculty Registration Rejected',
          message: `Registration for Teacher ${teacher.name} was rejected. Reason: ${reason || 'Administrative discretion.'}`,
          type: 'TEACHER',
          read: false,
        });
      } catch {}

      return normalizeTeacher(teacher);
    }

    throw new AppError('Employee not found', 404);
  }

  async deleteEmployee(schoolId, id) {
    const staff = await SchoolUser.findOneAndDelete({ schoolId, _id: id });
    if (staff) return { success: true, message: 'Employee deleted successfully' };

    const teacher = await Teacher.findOneAndDelete({ schoolId, _id: id });
    if (teacher) return { success: true, message: 'Employee deleted successfully' };

    throw new AppError('Employee not found', 404);
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================
  async listDepartments(schoolId) {
    return hrRepository.listDepartments(schoolId);
  }

  async createDepartment(schoolId, payload = {}) {
    const name = (payload.name || '').trim();
    if (!name) throw new AppError('Department name is required', 400);

    const existing = await hrRepository.findDepartmentByName(schoolId, name);
    if (existing) throw new AppError('A department with this name already exists', 400);

    const dept = await hrRepository.createDepartment(schoolId, {
      name,
      code: payload.code || name.slice(0, 3).toUpperCase(),
      headEmployeeId: payload.headEmployeeId || null,
      headEmployeeName: payload.headEmployeeName || '',
      description: payload.description || '',
      status: payload.status || 'ACTIVE',
    });
    return dept.toPublicJSON();
  }

  async updateDepartment(schoolId, id, payload = {}) {
    const dept = await hrRepository.updateDepartment(schoolId, id, payload);
    if (!dept) throw new AppError('Department not found', 404);
    return dept.toPublicJSON();
  }

  async deleteDepartment(schoolId, id) {
    const dept = await hrRepository.deleteDepartment(schoolId, id);
    if (!dept) throw new AppError('Department not found', 404);
    return { success: true, message: 'Department deleted successfully' };
  }

  // ==========================================
  // DESIGNATIONS
  // ==========================================
  async listDesignations(schoolId, query = {}) {
    return hrRepository.listDesignations(schoolId, query.departmentId);
  }

  async createDesignation(schoolId, payload = {}) {
    const title = (payload.title || '').trim();
    if (!title) throw new AppError('Designation title is required', 400);

    const existing = await hrRepository.findDesignationByTitle(schoolId, title);
    if (existing) throw new AppError('A designation with this title already exists', 400);

    const desig = await hrRepository.createDesignation(schoolId, {
      title,
      departmentId: payload.departmentId || null,
      departmentName: payload.departmentName || '',
      level: Number(payload.level) || 1,
      description: payload.description || '',
      status: payload.status || 'ACTIVE',
    });
    return desig.toPublicJSON();
  }

  async updateDesignation(schoolId, id, payload = {}) {
    const desig = await hrRepository.updateDesignation(schoolId, id, payload);
    if (!desig) throw new AppError('Designation not found', 404);
    return desig.toPublicJSON();
  }

  async deleteDesignation(schoolId, id) {
    const desig = await hrRepository.deleteDesignation(schoolId, id);
    if (!desig) throw new AppError('Designation not found', 404);
    return { success: true, message: 'Designation deleted successfully' };
  }

  // ==========================================
  // LEAVE MANAGEMENT
  // ==========================================
  async listLeaveRequests(schoolId, query = {}) {
    return hrRepository.listLeaveRequests(schoolId, query);
  }

  async createLeaveRequest(schoolId, payload = {}) {
    if (!payload.employeeRefId) throw new AppError('Employee selection is required', 400);
    if (!payload.startDate || !payload.endDate) throw new AppError('Start and end dates are required', 400);
    if (!payload.reason) throw new AppError('Reason for leave is required', 400);

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (end < start) throw new AppError('End date cannot be before start date', 400);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = Number(payload.totalDays) || diffDays;

    const settings = await hrRepository.getSettings(schoolId);
    const initialStatus = settings.autoApproveLeaves ? 'APPROVED' : 'PENDING';

    const leave = await hrRepository.createLeaveRequest(schoolId, {
      ...payload,
      totalDays,
      status: initialStatus,
      approvedBy: initialStatus === 'APPROVED' ? 'System (Auto)' : '',
      approvedAt: initialStatus === 'APPROVED' ? new Date() : null,
    });

    return leave.toPublicJSON();
  }

  async approveLeave(schoolId, id, approverName = 'HR Manager') {
    const leave = await hrRepository.updateLeaveRequest(schoolId, id, {
      status: 'APPROVED',
      approvedBy: approverName,
      approvedAt: new Date(),
    });
    if (!leave) throw new AppError('Leave request not found', 404);
    return leave.toPublicJSON();
  }

  async rejectLeave(schoolId, id, reason = '', rejectorName = 'HR Manager') {
    const leave = await hrRepository.updateLeaveRequest(schoolId, id, {
      status: 'REJECTED',
      rejectedBy: rejectorName,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
    if (!leave) throw new AppError('Leave request not found', 404);
    return leave.toPublicJSON();
  }

  async cancelLeave(schoolId, id) {
    const leave = await hrRepository.updateLeaveRequest(schoolId, id, {
      status: 'CANCELLED',
    });
    if (!leave) throw new AppError('Leave request not found', 404);
    return leave.toPublicJSON();
  }

  async getLeaveBalance(schoolId, employeeRefId) {
    const currentYear = new Date().getFullYear();
    const [settings, usedLeaves] = await Promise.all([
      hrRepository.getSettings(schoolId),
      hrRepository.getEmployeeApprovedLeaveDays(schoolId, employeeRefId, currentYear),
    ]);

    const casualQuota = settings.casualLeaveQuota || 12;
    const medicalQuota = settings.medicalLeaveQuota || 6;
    const paidQuota = settings.paidLeaveQuota || 10;

    return {
      year: currentYear,
      casual: {
        quota: casualQuota,
        used: usedLeaves.CASUAL || 0,
        available: Math.max(0, casualQuota - (usedLeaves.CASUAL || 0)),
      },
      medical: {
        quota: medicalQuota,
        used: usedLeaves.MEDICAL || 0,
        available: Math.max(0, medicalQuota - (usedLeaves.MEDICAL || 0)),
      },
      paid: {
        quota: paidQuota,
        used: usedLeaves.PAID || 0,
        available: Math.max(0, paidQuota - (usedLeaves.PAID || 0)),
      },
      unpaid: {
        used: usedLeaves.UNPAID || 0,
      },
      totalUsed: usedLeaves.TOTAL || 0,
    };
  }

  // ==========================================
  // PERFORMANCE REVIEWS
  // ==========================================
  async listPerformanceReviews(schoolId, query = {}) {
    return hrRepository.listPerformanceReviews(schoolId, query);
  }

  async createPerformanceReview(schoolId, payload = {}) {
    if (!payload.employeeRefId) throw new AppError('Employee selection is required', 400);
    if (!payload.reviewPeriod) throw new AppError('Review period is required', 400);
    if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    const review = await hrRepository.createPerformanceReview(schoolId, payload);
    return review.toPublicJSON();
  }

  async getPerformanceReview(schoolId, id) {
    const review = await hrRepository.findPerformanceReviewById(schoolId, id);
    if (!review) throw new AppError('Review not found', 404);
    return review.toPublicJSON();
  }

  async updatePerformanceReview(schoolId, id, payload = {}) {
    const review = await hrRepository.updatePerformanceReview(schoolId, id, payload);
    if (!review) throw new AppError('Review not found', 404);
    return review.toPublicJSON();
  }

  async deletePerformanceReview(schoolId, id) {
    const review = await hrRepository.deletePerformanceReview(schoolId, id);
    if (!review) throw new AppError('Review not found', 404);
    return { success: true, message: 'Review deleted successfully' };
  }

  // ==========================================
  // DOCUMENTS MANAGEMENT
  // ==========================================
  async listDocuments(schoolId, query = {}) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    
    // 1. Fetch from EmployeeDocument collection
    const docsResult = await hrRepository.listEmployeeDocuments(schoolId, { ...query, limit: 500 });
    const allDocs = [...docsResult.items];

    // 2. Also incorporate legacy attached documents from SchoolUser / Teacher if not already present
    if (!query.documentType || query.documentType === 'ALL') {
      const employees = await this.listEmployees(schoolId, { limit: 200 });
      employees.items.forEach((emp) => {
        (emp.documents || []).forEach((doc) => {
          const docId = `legacy-${emp.id}-${doc.id || doc.name}`;
          if (!allDocs.some((d) => d.fileUrl === doc.url || d.url === doc.url)) {
            allDocs.push({
              id: docId,
              employeeId: emp.employeeId,
              employeeRefId: emp.id,
              employeeName: emp.name,
              employeeType: emp.employeeType,
              department: emp.department,
              documentType: doc.type || 'Identity Proof',
              documentName: doc.name || 'Document',
              url: doc.url,
              fileUrl: doc.url,
              fileSize: 0,
              verificationStatus: 'VERIFIED',
              status: 'VERIFIED',
              verifiedBy: 'System',
              remarks: 'Legacy Master Profile Document',
              uploadedAt: doc.uploadedAt || emp.createdAt,
            });
          }
        });
      });
    }

    // Apply search filter on combined list if present
    let filtered = allDocs;
    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (d) =>
          (d.employeeName || '').toLowerCase().includes(q) ||
          (d.employeeId || '').toLowerCase().includes(q) ||
          (d.documentType || '').toLowerCase().includes(q) ||
          (d.documentName || '').toLowerCase().includes(q) ||
          (d.department || '').toLowerCase().includes(q)
      );
    }

    if (query.status && query.status !== 'ALL') {
      filtered = filtered.filter((d) => d.verificationStatus === query.status.toUpperCase());
    }

    if (query.documentType && query.documentType !== 'ALL') {
      filtered = filtered.filter((d) => d.documentType === query.documentType);
    }

    return filtered;
  }

  async uploadDocument(schoolId, payload = {}, fileUrl) {
    if (!payload.employeeRefId) {
      throw new AppError('Employee ID is required for document upload', 400);
    }
    if (!fileUrl) {
      throw new AppError('File document is required', 400);
    }

    let employee = null;
    let employeeType = 'STAFF';

    const staff = await SchoolUser.findOne({ schoolId, _id: payload.employeeRefId });
    if (staff) {
      employee = staff;
      employeeType = 'STAFF';
    } else {
      const teacher = await Teacher.findOne({ schoolId, _id: payload.employeeRefId });
      if (teacher) {
        employee = teacher;
        employeeType = 'TEACHER';
      }
    }

    if (!employee) {
      throw new AppError('Employee record not found for document upload', 404);
    }

    const employeeName = employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Staff';
    const employeeId = employee.employeeId || `EMP-${employee._id.toString().slice(-4)}`;
    const department = employee.department || employee.employmentDetails?.department || 'General';

    const doc = await hrRepository.createDocument(schoolId, {
      employeeRefId: employee._id,
      employeeType,
      employeeId,
      employeeName,
      department,
      documentType: payload.documentType || 'Identity Proof',
      documentName: payload.documentName || 'Staff Document',
      fileUrl,
      fileSize: payload.fileSize || 0,
      verificationStatus: payload.verificationStatus || 'VERIFIED',
      verifiedBy: payload.verifiedBy || 'HR Admin',
      remarks: payload.remarks || '',
    });

    return doc.toPublicJSON();
  }

  async verifyDocument(schoolId, id, status, verifiedBy = 'HR Admin') {
    const valid = ['VERIFIED', 'PENDING', 'REJECTED'];
    if (!valid.includes((status || '').toUpperCase())) {
      throw new AppError('Invalid verification status', 400);
    }

    const updated = await hrRepository.updateDocumentVerification(schoolId, id, status, verifiedBy);
    if (!updated) {
      throw new AppError('Document record not found', 404);
    }
    return updated.toPublicJSON();
  }

  async deleteDocument(schoolId, id) {
    // If legacy id, reject deletion or handle gracefully
    if (String(id).startsWith('legacy-')) {
      return { success: true, message: 'Legacy reference cleared from view.' };
    }

    const doc = await hrRepository.findDocumentById(schoolId, id);
    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    if (doc.fileUrl) {
      deleteUploadedFile(doc.fileUrl);
    }

    await hrRepository.deleteDocument(schoolId, id);
    return { success: true, message: 'Document removed from locker successfully.' };
  }

  // ==========================================
  // HR SETTINGS
  // ==========================================
  async getSettings(schoolId) {
    const s = await hrRepository.getSettings(schoolId);
    return s.toPublicJSON();
  }

  async updateSettings(schoolId, payload = {}) {
    const s = await hrRepository.updateSettings(schoolId, payload);
    return s.toPublicJSON();
  }

  // ==========================================
  // REPORTS
  // ==========================================
  async getReportData(schoolId, category, query = {}) {
    const sId = new mongoose.Types.ObjectId(schoolId);

    switch (category) {
      case 'employee-summary': {
        const [staff, teachers, deptAgg] = await Promise.all([
          SchoolUser.find({ schoolId, role: { $ne: 'SCHOOLADMIN' } }),
          Teacher.find({ schoolId }),
          SchoolUser.aggregate([
            { $match: { schoolId: sId } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
          ]),
        ]);
        return {
          totalStaff: staff.length,
          totalTeachers: teachers.length,
          activeCount: staff.filter((s) => s.status === 'ACTIVE').length + teachers.filter((t) => t.status === 'ACTIVE').length,
          departmentBreakdown: deptAgg.map((d) => ({ name: d._id || 'Unassigned', count: d.count })),
        };
      }

      case 'attendance-summary': {
        const now = new Date();
        const monthStr = query.month || now.toISOString().slice(0, 7);
        const agg = await StaffAttendance.aggregate([
          { $match: { schoolId: sId, date: { $regex: `^${monthStr}` } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const summary = { PRESENT: 0, ABSENT: 0, LEAVE: 0, HALF_DAY: 0, HOLIDAY: 0 };
        agg.forEach((a) => {
          summary[a._id] = a.count;
        });
        return { month: monthStr, summary };
      }

      case 'leave-summary': {
        const year = query.year || new Date().getFullYear().toString();
        const agg = await hrRepository.listLeaveRequests(schoolId, { limit: 500 });
        return {
          year,
          stats: agg.stats,
          recentApproved: agg.items.filter((i) => i.status === 'APPROVED').slice(0, 10),
        };
      }

      case 'payroll-summary': {
        const agg = await Payroll.aggregate([
          { $match: { schoolId: sId } },
          {
            $group: {
              _id: '$payrollMonth',
              totalNet: { $sum: '$netSalary' },
              totalGross: { $sum: '$grossEarnings' },
              totalDeductions: { $sum: '$totalDeductions' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 12 },
        ]);
        return { monthlySummary: agg };
      }

      case 'department-wise': {
        const depts = await hrRepository.listDepartments(schoolId);
        return { departments: depts };
      }

      default:
        throw new AppError(`Unknown report category: ${category}`, 400);
    }
  }

  // ==========================================
  // ANNOUNCEMENTS (REUSING PlatformNotification)
  // ==========================================
  async listAnnouncements(schoolId) {
    const school = await School.findById(schoolId);
    const notifications = await PlatformNotification.find({
      $or: [{ schoolId: schoolId.toString() }, { schoolId: '' }],
      audiences: { $in: ['staff', 'teacher', 'admin', 'hr'] },
    }).sort({ createdAt: -1 }).limit(30);

    return notifications.map((n) => n.toPublicJSON());
  }

  async createAnnouncement(schoolId, payload = {}, creatorName = 'HR Desk') {
    if (!payload.title || !payload.body) {
      throw new AppError('Title and message are required', 400);
    }
    const school = await School.findById(schoolId);
    const notification = await PlatformNotification.create({
      title: payload.title,
      body: payload.body,
      audiences: payload.audiences || ['staff', 'teacher', 'hr'],
      schoolId: schoolId.toString(),
      schoolName: school?.name || 'School',
      createdBy: creatorName,
    });
    return notification.toPublicJSON();
  }
}

export const hrService = new HRService();
