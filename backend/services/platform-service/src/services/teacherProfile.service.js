import { AppError } from '../../../shared/AppError.js';
import { Teacher } from '../models/Teacher.js';
import { School } from '../models/School.js';
import { schoolThemeSnapshot } from './school.service.js';
import { deleteUploadedFile, toTeacherPhotoPublicPath } from '../utils/upload.utils.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

// Only these keys are self-editable. schoolId / role / status / employeeId /
// account / payroll / qualifications / experiences are NOT — a teacher cannot
// escalate or move schools by editing their own profile.
const EDITABLE = new Set([
  'firstName',
  'middleName',
  'lastName',
  'phone',
  'mobileNumber',
  'alternateMobile',
  'bloodGroup',
  'maritalStatus',
  'nationality',
  'emergencyContactName',
  'emergencyContactNumber',
  'emergencyContactRelationship',
]);
const PROTECTED = new Set([
  'schoolId',
  'role',
  'status',
  'employeeId',
  'account',
  'payroll',
  'passwordHash',
  'mustResetPassword',
  '_id',
  'id',
]);

const str = (v, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const PHONE_KEYS = new Set(['phone', 'mobileNumber', 'alternateMobile', 'emergencyContactNumber']);
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

class TeacherProfileService {
  async getProfile(schoolId, teacherId) {
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher) throw new AppError('Teacher profile not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);
    const school = await School.findById(schoolId);
    return {
      ...teacher.toPublicJSON(),
      school: {
        id: String(schoolId),
        name: school?.name || '',
        academicSession: school?.academic?.session || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async updateProfile(schoolId, teacherId, body = {}, files = {}) {
    const rejected = Object.keys(body).filter((k) => PROTECTED.has(k));
    if (rejected.length) {
      throw new AppError(`These fields cannot be changed here: ${rejected.join(', ')}`, 400, TEACHER_ERR.VALIDATION_ERROR);
    }

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher) throw new AppError('Teacher profile not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);

    for (const key of Object.keys(body)) {
      if (!EDITABLE.has(key)) continue;
      const value = str(body[key]);
      if (PHONE_KEYS.has(key) && value && !PHONE_RE.test(value)) {
        throw new AppError(`${key} is not a valid phone number`, 400, TEACHER_ERR.VALIDATION_ERROR);
      }
      if ((key === 'phone' || key === 'mobileNumber') && !value) {
        throw new AppError('Mobile number cannot be empty', 400, TEACHER_ERR.VALIDATION_ERROR);
      }
      teacher[key] = value;
    }
    // multipart sends nested objects as a JSON string
    let address = body.address;
    if (typeof address === 'string') {
      try {
        address = JSON.parse(address);
      } catch {
        address = null;
      }
    }
    if (address && typeof address === 'object') {
      for (const k of ['addressLine', 'city', 'state', 'country', 'pincode']) {
        if (address[k] !== undefined) teacher.address[k] = str(address[k], k === 'addressLine' ? 300 : 100);
      }
    }
    if (body.firstName !== undefined || body.lastName !== undefined || body.middleName !== undefined) {
      teacher.name = [teacher.firstName, teacher.middleName, teacher.lastName].map(str).filter(Boolean).join(' ') || teacher.name;
    }
    // keep phone/mobileNumber in sync (model mirrors them)
    if (body.mobileNumber !== undefined && body.phone === undefined) teacher.phone = str(body.mobileNumber);

    const photo = files.photo || null;
    if (photo) {
      if (teacher.profilePhoto) deleteUploadedFile(teacher.profilePhoto);
      teacher.profilePhoto = toTeacherPhotoPublicPath(photo.filename);
    } else if (body.removePhoto === true || body.removePhoto === 'true') {
      if (teacher.profilePhoto) deleteUploadedFile(teacher.profilePhoto);
      teacher.profilePhoto = '';
    }

    await teacher.save();
    return teacher.toPublicJSON();
  }

  async getDocuments(schoolId, teacherId) {
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId }).lean();
    if (!teacher) throw new AppError('Teacher profile not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);
    const docs = teacher.documents && typeof teacher.documents === 'object' ? teacher.documents : {};
    const list = (arr) => (Array.isArray(arr) ? arr.filter(Boolean) : []);
    return {
      pan: list(docs.pan),
      aadhaar: list(docs.aadhaar),
      others: list(docs.others),
      qualificationCertificates: list((teacher.qualifications || []).map((q) => q.certificateFile).filter(Boolean)),
    };
  }
}

export const teacherProfileService = new TeacherProfileService();
