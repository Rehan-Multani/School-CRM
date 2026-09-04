import { AppError } from '../../../shared/AppError.js';
import { admissionRepository } from '../repositories/admission.repository.js';
import { ADMISSION_STATUSES, ADMISSION_SOURCES, ADMISSION_GENDERS } from '../models/Admission.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Student } from '../models/Student.js';
import { studentService } from './student.service.js';

function pickEnum(value, list, fallback) {
  const up = String(value || '').toUpperCase();
  return list.includes(up) ? up : fallback;
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  const firstName = parts.shift() || 'Student';
  const lastName = parts.join(' ');
  return { firstName, lastName };
}

async function currentYear(schoolId) {
  const year =
    (await AcademicYear.findOne({ schoolId, isCurrent: true })) ||
    (await AcademicYear.findOne({ schoolId, status: 'ACTIVE' }).sort({ createdAt: -1 })) ||
    (await AcademicYear.findOne({ schoolId }).sort({ createdAt: -1 }));
  if (!year) throw new AppError('No academic year configured. Create one before approving admissions.', 400);
  return year;
}

async function genAdmissionNo(schoolId) {
  const yr = new Date().getFullYear();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = `ADM-${yr}-${rand}`;
    const clash = await Student.findOne({ schoolId, admissionNumber: candidate }).lean();
    if (!clash) return candidate;
  }
  return `ADM-${yr}-${Date.now().toString().slice(-6)}`;
}

class AdmissionService {
  async list(schoolId, query = {}) {
    const { items, total, page, limit } = await admissionRepository.list(schoolId, query);
    return { data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async stats(schoolId) {
    return admissionRepository.stats(schoolId);
  }

  async get(schoolId, id) {
    const doc = await admissionRepository.findById(schoolId, id);
    if (!doc) throw new AppError('Admission application not found', 404);
    return doc.toPublicJSON();
  }

  async create(schoolId, payload = {}, actorName = '') {
    const applicantName = (payload.applicantName || '').trim();
    if (!applicantName) throw new AppError('Applicant name is required', 400);
    if (!payload.guardianName?.trim()) throw new AppError('Guardian name is required', 400);
    if (!payload.phone?.trim()) throw new AppError('Guardian phone is required', 400);

    const dup = await admissionRepository.findDuplicate(schoolId, {
      phone: payload.phone,
      email: payload.email,
    });
    if (dup) {
      throw new AppError(
        `An active application already exists for this phone/email (${dup.applicantName})`,
        409
      );
    }

    let appliedClassLabel = (payload.appliedClassLabel || '').trim();
    if (payload.appliedClassId && !appliedClassLabel) {
      const cls = await SchoolClass.findOne({ schoolId, _id: payload.appliedClassId }).lean();
      appliedClassLabel = cls?.name || '';
    }

    const source = pickEnum(payload.source, ADMISSION_SOURCES, 'ONLINE');
    const doc = await admissionRepository.create(schoolId, {
      applicantName,
      gender: pickEnum(payload.gender, ADMISSION_GENDERS, 'OTHER'),
      dob: payload.dob ? new Date(payload.dob) : null,
      appliedClassId: payload.appliedClassId || null,
      appliedClassLabel,
      preferredSectionId: payload.preferredSectionId || null,
      guardianName: payload.guardianName.trim(),
      phone: payload.phone.trim(),
      email: (payload.email || '').trim().toLowerCase(),
      address: (payload.address || '').trim(),
      previousSchool: (payload.previousSchool || '').trim(),
      category: (payload.category || 'General').trim(),
      source,
      documents: Array.isArray(payload.documents) ? payload.documents : [],
      documentsStatus: payload.documentsStatus || (source === 'OFFLINE' ? 'Verified' : 'Pending'),
      status: 'PENDING_REVIEW',
      appliedDate: new Date(),
      reviewedBy: actorName,
    });
    return doc.toPublicJSON();
  }

  async update(schoolId, id, payload = {}) {
    const existing = await admissionRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Admission application not found', 404);
    if (existing.status === 'ENROLLED') {
      throw new AppError('This application is already enrolled and cannot be edited', 400);
    }

    const patch = {};
    const textFields = [
      'applicantName',
      'guardianName',
      'phone',
      'email',
      'address',
      'previousSchool',
      'category',
      'appliedClassLabel',
    ];
    textFields.forEach((f) => {
      if (payload[f] !== undefined) patch[f] = String(payload[f] || '').trim();
    });
    if (payload.email !== undefined) patch.email = String(payload.email || '').trim().toLowerCase();
    if (payload.gender !== undefined) patch.gender = pickEnum(payload.gender, ADMISSION_GENDERS, existing.gender);
    if (payload.dob !== undefined) patch.dob = payload.dob ? new Date(payload.dob) : null;
    if (payload.appliedClassId !== undefined) patch.appliedClassId = payload.appliedClassId || null;
    if (payload.preferredSectionId !== undefined) patch.preferredSectionId = payload.preferredSectionId || null;
    if (payload.documents !== undefined) {
      patch.documents = Array.isArray(payload.documents) ? payload.documents : [];
    }
    if (payload.documentsStatus !== undefined) patch.documentsStatus = String(payload.documentsStatus || '').trim();

    if (patch.applicantName === '') throw new AppError('Applicant name cannot be empty', 400);

    const doc = await admissionRepository.update(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async setStatus(schoolId, id, status, reason = '', actorName = '') {
    const next = pickEnum(status, ADMISSION_STATUSES, null);
    if (!next) throw new AppError('Invalid admission status', 400);
    if (next === 'ENROLLED') {
      throw new AppError('Use the approve action to enrol an applicant', 400);
    }
    const existing = await admissionRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Admission application not found', 404);
    if (existing.status === 'ENROLLED') {
      throw new AppError('This application is already enrolled', 400);
    }
    const patch = {
      status: next,
      reviewedBy: actorName || existing.reviewedBy,
      reviewedAt: new Date(),
    };
    if (next === 'REJECTED') patch.rejectionReason = (reason || '').trim();
    const doc = await admissionRepository.update(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async approve(schoolId, id, payload = {}, actorName = '') {
    const admission = await admissionRepository.findById(schoolId, id);
    if (!admission) throw new AppError('Admission application not found', 404);

    // Idempotent
    if (admission.status === 'ENROLLED' && admission.convertedStudentId) {
      return {
        admission: admission.toPublicJSON(),
        student: await studentService.getStudent(schoolId, admission.convertedStudentId).catch(() => null),
        alreadyEnrolled: true,
      };
    }
    if (admission.status === 'REJECTED') {
      throw new AppError('Re-open this application (set to Pending) before approving', 400);
    }

    const classId = payload.classId || admission.appliedClassId;
    if (!classId) throw new AppError('An applied class is required to approve this application', 400);
    const cls = await SchoolClass.findOne({ schoolId, _id: classId }).lean();
    if (!cls) throw new AppError('Applied class not found', 404);

    const year = await currentYear(schoolId);

    // Resolve a section: explicit -> preferred -> first section of class w/ capacity.
    let sectionId = payload.sectionId || admission.preferredSectionId;
    const sectionQuery = { schoolId, classId, academicYearId: year._id, status: 'ACTIVE' };
    const sections = await Section.find(sectionQuery).lean();
    if (!sections.length) {
      throw new AppError(
        `No active section exists for ${cls.name} in ${year.name}. Create one first.`,
        400
      );
    }
    if (sectionId) {
      const ok = sections.find((s) => s._id.toString() === sectionId.toString());
      if (!ok) sectionId = null;
    }
    if (!sectionId) {
      // pick the section with the most free capacity
      const counts = await Promise.all(
        sections.map((s) =>
          StudentEnrollment.countDocuments({ schoolId, sectionId: s._id, status: 'ACTIVE' })
        )
      );
      let bestIdx = 0;
      let bestFree = -Infinity;
      sections.forEach((s, i) => {
        const free = (s.capacity || 0) - counts[i];
        if (free > bestFree) {
          bestFree = free;
          bestIdx = i;
        }
      });
      if (bestFree <= 0) {
        throw new AppError(`All sections of ${cls.name} in ${year.name} are full`, 400);
      }
      sectionId = sections[bestIdx]._id.toString();
    }

    const admissionNo = await genAdmissionNo(schoolId);
    const { firstName, lastName } = splitName(admission.applicantName);

    const student = await studentService.createStudent(schoolId, {
      academicYearId: year._id.toString(),
      classId: classId.toString(),
      sectionId: sectionId.toString(),
      admissionNumber: admissionNo,
      firstName,
      lastName,
      gender: admission.gender,
      dateOfBirth: admission.dob || undefined,
      email: admission.email || undefined,
      phone: admission.phone || undefined,
      parentName: admission.guardianName || 'Guardian',
      parentPhone: admission.phone || '0000000000',
      address: admission.address || undefined,
      status: 'ACTIVE',
    });

    const updated = await admissionRepository.update(schoolId, id, {
      status: 'ENROLLED',
      reviewedBy: actorName || admission.reviewedBy,
      reviewedAt: new Date(),
      convertedStudentId: student.id,
      admissionNo,
      studentId: student.id,
    });

    return { admission: updated.toPublicJSON(), student, alreadyEnrolled: false };
  }

  async remove(schoolId, id) {
    const existing = await admissionRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Admission application not found', 404);
    if (existing.status === 'ENROLLED') {
      throw new AppError('Cannot delete an enrolled application', 400);
    }
    await admissionRepository.remove(schoolId, id);
    return { success: true, message: 'Admission application deleted' };
  }
}

export const admissionService = new AdmissionService();
