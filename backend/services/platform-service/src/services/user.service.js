import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { userRepository } from '../repositories/user.repository.js';
import { deleteUploadedFile } from '../utils/upload.utils.js';

const VALID_ROLES = ['TEACHER', 'LIBRARIAN', 'HR', 'ACCOUNTANT', 'TRANSPORT', 'PRINCIPAL'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const VALID_ACCOUNT_TYPES = ['SAVINGS', 'CURRENT', 'SALARY'];

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureOption(value, options, label) {
  const text = requireText(value, label).toUpperCase();
  if (!options.includes(text)) throw new AppError(`${label} must be one of: ${options.join(', ')}`, 400);
  return text;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

class UserService {
  async listUsers(schoolId, query = {}) {
    const result = await userRepository.listUsers(schoolId, query);
    return {
      data: result.items.map((item) => item.toPublicJSON()),
      stats: result.stats,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getUser(schoolId, id) {
    const user = await userRepository.findUserById(schoolId, id);
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicJSON();
  }

  async createUser(schoolId, payload = {}, files = {}) {
    const firstName = requireText(payload.firstName, 'First Name');
    const lastName = optionalText(payload.lastName);
    const email = requireText(payload.email, 'Email Address').toLowerCase();
    const employeeId = requireText(payload.employeeId, 'Employee ID');
    const role = ensureOption(payload.role, VALID_ROLES, 'Role');
    const rawPassword = payload.password ? String(payload.password).trim() : 'Password@123';

    if (rawPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Check duplicate email
    const existingEmail = await userRepository.findUserByEmail(schoolId, email);
    if (existingEmail) {
      throw new AppError(`User with email "${email}" already exists in this school`, 409);
    }

    // Check duplicate employee ID
    const existingEmp = await userRepository.findUserByEmployeeId(schoolId, employeeId);
    if (existingEmp) {
      throw new AppError(`Employee ID "${employeeId}" is already assigned to another user`, 409);
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const fullName = `${firstName} ${lastName}`.trim();

    // Bank details
    const bankDetails = {
      accountName: optionalText(payload.accountName || payload.accountHolderName),
      accountNumber: optionalText(payload.accountNumber),
      ifscCode: optionalText(payload.ifscCode).toUpperCase(),
      bankName: optionalText(payload.bankName),
      branchName: optionalText(payload.branchName),
      accountType: payload.accountType && VALID_ACCOUNT_TYPES.includes(payload.accountType.toUpperCase())
        ? payload.accountType.toUpperCase()
        : 'SALARY',
    };

    // Documents (max 3 images)
    const docs = Array.isArray(files.documents) ? files.documents.slice(0, 3) : [];

    const created = await userRepository.createUser({
      schoolId,
      employeeId,
      firstName,
      lastName,
      name: fullName,
      email,
      passwordHash,
      role,
      phone: optionalText(payload.phone || payload.mobileNumber),
      gender: payload.gender && VALID_GENDERS.includes(payload.gender.toUpperCase())
        ? payload.gender.toUpperCase()
        : 'MALE',
      specialization: optionalText(payload.specialization),
      joiningDate: parseDate(payload.joiningDate) || new Date(),
      department: optionalText(payload.department),
      designation: optionalText(payload.designation) || role,
      basicSalary: Number(payload.basicSalary) || 0,
      bankDetails,
      documents: docs,
      photo: files.photo || '',
      status: payload.status && VALID_STATUSES.includes(payload.status.toUpperCase())
        ? payload.status.toUpperCase()
        : 'ACTIVE',
    });

    return created.toPublicJSON();
  }

  async updateUser(schoolId, id, payload = {}, files = {}) {
    const user = await userRepository.findUserById(schoolId, id);
    if (!user) throw new AppError('User not found', 404);

    const updates = {};

    if (payload.firstName !== undefined || payload.lastName !== undefined) {
      const firstName = payload.firstName !== undefined ? requireText(payload.firstName, 'First Name') : user.firstName;
      const lastName = payload.lastName !== undefined ? optionalText(payload.lastName) : user.lastName;
      updates.firstName = firstName;
      updates.lastName = lastName;
      updates.name = `${firstName} ${lastName}`.trim();
    }

    if (payload.email !== undefined) {
      const email = requireText(payload.email, 'Email Address').toLowerCase();
      if (email !== user.email) {
        const existingEmail = await userRepository.findUserByEmail(schoolId, email);
        if (existingEmail && existingEmail.id !== id) {
          throw new AppError(`User with email "${email}" already exists`, 409);
        }
        updates.email = email;
      }
    }

    if (payload.employeeId !== undefined) {
      const employeeId = requireText(payload.employeeId, 'Employee ID');
      if (employeeId !== user.employeeId) {
        const existingEmp = await userRepository.findUserByEmployeeId(schoolId, employeeId);
        if (existingEmp && existingEmp.id !== id) {
          throw new AppError(`Employee ID "${employeeId}" already assigned to another user`, 409);
        }
        updates.employeeId = employeeId;
      }
    }

    if (payload.role !== undefined) {
      updates.role = ensureOption(payload.role, VALID_ROLES, 'Role');
    }

    if (payload.phone !== undefined) updates.phone = optionalText(payload.phone);
    if (payload.gender !== undefined) {
      updates.gender = VALID_GENDERS.includes(payload.gender.toUpperCase()) ? payload.gender.toUpperCase() : 'MALE';
    }
    if (payload.specialization !== undefined) updates.specialization = optionalText(payload.specialization);
    if (payload.joiningDate !== undefined) updates.joiningDate = parseDate(payload.joiningDate);
    if (payload.department !== undefined) updates.department = optionalText(payload.department);
    if (payload.designation !== undefined) updates.designation = optionalText(payload.designation);
    if (payload.basicSalary !== undefined) updates.basicSalary = Number(payload.basicSalary) || 0;

    // Bank Details
    if (
      payload.accountName !== undefined ||
      payload.accountHolderName !== undefined ||
      payload.accountNumber !== undefined ||
      payload.ifscCode !== undefined ||
      payload.bankName !== undefined ||
      payload.branchName !== undefined ||
      payload.accountType !== undefined
    ) {
      updates.bankDetails = {
        accountName: payload.accountName !== undefined || payload.accountHolderName !== undefined
          ? optionalText(payload.accountName || payload.accountHolderName)
          : user.bankDetails?.accountName || '',
        accountNumber: payload.accountNumber !== undefined ? optionalText(payload.accountNumber) : user.bankDetails?.accountNumber || '',
        ifscCode: payload.ifscCode !== undefined ? optionalText(payload.ifscCode).toUpperCase() : user.bankDetails?.ifscCode || '',
        bankName: payload.bankName !== undefined ? optionalText(payload.bankName) : user.bankDetails?.bankName || '',
        branchName: payload.branchName !== undefined ? optionalText(payload.branchName) : user.bankDetails?.branchName || '',
        accountType: payload.accountType && VALID_ACCOUNT_TYPES.includes(payload.accountType.toUpperCase())
          ? payload.accountType.toUpperCase()
          : user.bankDetails?.accountType || 'SALARY',
      };
    }

    // Photo updates
    if (files.photo) {
      if (user.photo) deleteUploadedFile(user.photo);
      updates.photo = files.photo;
    } else if (payload.removePhoto === true || payload.removePhoto === 'true') {
      if (user.photo) deleteUploadedFile(user.photo);
      updates.photo = '';
    }

    // Document uploads (maintain up to 3)
    let currentDocs = Array.isArray(user.documents) ? [...user.documents] : [];
    if (payload.removeDocuments) {
      const toRemove = Array.isArray(payload.removeDocuments) ? payload.removeDocuments : [payload.removeDocuments];
      toRemove.forEach((docPath) => {
        deleteUploadedFile(docPath);
        currentDocs = currentDocs.filter((d) => d !== docPath);
      });
    }

    if (Array.isArray(files.documents) && files.documents.length > 0) {
      currentDocs = [...currentDocs, ...files.documents].slice(0, 3);
    }
    updates.documents = currentDocs;

    if (payload.status !== undefined) {
      updates.status = ensureOption(payload.status, VALID_STATUSES, 'Status');
    }

    const updated = await userRepository.updateUser(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  async updateUserStatus(schoolId, id, status) {
    const validStatus = ensureOption(status, VALID_STATUSES, 'Status');
    const user = await userRepository.findUserById(schoolId, id);
    if (!user) throw new AppError('User not found', 404);

    const updated = await userRepository.updateUser(schoolId, id, { status: validStatus });
    return updated.toPublicJSON();
  }

  async changeUserPassword(schoolId, id, newPassword) {
    const password = requireText(newPassword, 'New Password');
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    const user = await userRepository.findUserById(schoolId, id);
    if (!user) throw new AppError('User not found', 404);

    const passwordHash = await bcrypt.hash(password, 10);
    await userRepository.updateUser(schoolId, id, { passwordHash });

    return { success: true, message: `Password updated successfully for ${user.name}` };
  }

  async sendUserCredentials(schoolId, id) {
    const user = await userRepository.findUserById(schoolId, id);
    if (!user) throw new AppError('User not found', 404);

    // Record timestamp of dispatch
    await userRepository.updateUser(schoolId, id, { credentialsSentAt: new Date() });

    return {
      success: true,
      message: `Login credentials and instructions dispatched to ${user.email}`,
      dispatchedTo: user.email,
      sentAt: new Date(),
    };
  }

  async deleteUser(schoolId, id) {
    const user = await userRepository.findUserById(schoolId, id);
    if (!user) throw new AppError('User not found', 404);

    if (user.photo) deleteUploadedFile(user.photo);
    if (Array.isArray(user.documents)) {
      user.documents.forEach((doc) => deleteUploadedFile(doc));
    }

    await userRepository.deleteUser(schoolId, id);
    return { success: true, message: `User ${user.name} removed successfully` };
  }
}

export const userService = new UserService();
