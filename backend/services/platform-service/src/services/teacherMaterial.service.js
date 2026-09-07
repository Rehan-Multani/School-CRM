import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { studyMaterialRepository } from '../repositories/studyMaterial.repository.js';
import { academicRepository } from '../repositories/academic.repository.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { materialLite } from '../serializers/teacher.serializers.js';
import { deleteUploadedFile, toTeacherResourcePublicPath } from '../utils/upload.utils.js';
import { materialFileMeta } from '../middleware/uploadTeacherResource.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class TeacherMaterialService {
  async list(ctx, query = {}) {
    const { items, total, page, limit } = await studyMaterialRepository.list(ctx.schoolId, {
      ...query,
      teacherId: ctx.teacherId,
    });
    return {
      data: items.map((d) => materialLite(d.toPublicJSON())),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(ctx, id) {
    const doc = await studyMaterialRepository.findById(ctx.schoolId, id);
    if (!doc) throw new AppError('Material not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(doc, ctx.teacherId);
    return doc.toPublicJSON();
  }

  async create(ctx, payload = {}, file = null, actorName = '') {
    const title = String(payload.title || '').trim();
    if (!title) {
      if (file) deleteUploadedFile(toTeacherResourcePublicPath(file.filename));
      throw new AppError('Material title is required', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    if (!file) throw new AppError('A file is required', 400, TEACHER_ERR.VALIDATION_ERROR);

    const sectionId = String(payload.sectionId || '');
    const subjectId = String(payload.subjectId || '');
    try {
      teacherAccessService.assertSection(ctx, sectionId);
      teacherAccessService.assertSubjectInSection(ctx, sectionId, subjectId);
    } catch (err) {
      deleteUploadedFile(toTeacherResourcePublicPath(file.filename));
      throw err;
    }

    const [section, subject] = await Promise.all([
      academicRepository.findSectionById(ctx.schoolId, sectionId),
      academicRepository.findSubjectById(ctx.schoolId, subjectId),
    ]);
    const cls = section?.classId ? await academicRepository.findClassById(ctx.schoolId, section.classId) : null;
    const meta = materialFileMeta(file);

    const doc = await studyMaterialRepository.create({
      schoolId: oid(ctx.schoolId),
      academicYearId: ctx.currentYearId ? oid(ctx.currentYearId) : null,
      classId: section?.classId || null,
      className: cls?.name || '',
      sectionId: oid(sectionId),
      sectionName: section?.name || '',
      subjectId: oid(subjectId),
      subjectName: subject?.name || '',
      teacherId: oid(ctx.teacherId),
      teacherName: actorName,
      title,
      description: String(payload.description || '').trim().slice(0, 2000),
      fileName: meta.fileName,
      fileType: meta.fileType,
      fileSize: meta.fileSize,
      url: toTeacherResourcePublicPath(file.filename),
      visibility: String(payload.visibility).toUpperCase() === 'CLASS' ? 'CLASS' : 'SECTION',
      status: 'ACTIVE',
    });
    return doc.toPublicJSON();
  }

  async update(ctx, id, payload = {}, file = null) {
    const existing = await studyMaterialRepository.findById(ctx.schoolId, id);
    if (!existing) {
      if (file) deleteUploadedFile(toTeacherResourcePublicPath(file.filename));
      throw new AppError('Material not found', 404, TEACHER_ERR.NOT_FOUND);
    }
    try {
      teacherAccessService.assertOwnedBy(existing, ctx.teacherId);
    } catch (err) {
      if (file) deleteUploadedFile(toTeacherResourcePublicPath(file.filename));
      throw err;
    }

    const patch = {};
    if (payload.title !== undefined) {
      const t = String(payload.title).trim();
      if (!t) throw new AppError('Title cannot be empty', 400, TEACHER_ERR.VALIDATION_ERROR);
      patch.title = t;
    }
    if (payload.description !== undefined) patch.description = String(payload.description).trim().slice(0, 2000);
    if (payload.visibility !== undefined) patch.visibility = String(payload.visibility).toUpperCase() === 'CLASS' ? 'CLASS' : 'SECTION';
    if (payload.status !== undefined) patch.status = String(payload.status).toUpperCase() === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';

    if (file) {
      const meta = materialFileMeta(file);
      if (existing.url) deleteUploadedFile(existing.url);
      patch.fileName = meta.fileName;
      patch.fileType = meta.fileType;
      patch.fileSize = meta.fileSize;
      patch.url = toTeacherResourcePublicPath(file.filename);
    }

    const doc = await studyMaterialRepository.update(ctx.schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async remove(ctx, id) {
    const existing = await studyMaterialRepository.findById(ctx.schoolId, id);
    if (!existing) throw new AppError('Material not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(existing, ctx.teacherId);
    await studyMaterialRepository.remove(ctx.schoolId, id);
    if (existing.url) deleteUploadedFile(existing.url);
    return { message: 'Material deleted' };
  }
}

export const teacherMaterialService = new TeacherMaterialService();
