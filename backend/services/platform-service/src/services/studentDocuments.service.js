import mongoose from 'mongoose';
import path from 'path';
import { AppError } from '../../../shared/AppError.js';
import { Student } from '../models/Student.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * Read-only access to the authenticated student's OWN document set
 * (`Student.documents` — { aadhaar: [], marksheet: [], ... }). A student can
 * never see another student's documents: the query is pinned to
 * `_id = ctx.studentId` and the download-url guard rejects any path that does
 * not resolve under this student's own upload namespace.
 */
class StudentDocumentsService {
  async #load(ctx) {
    const student = await Student.findOne({ _id: oid(ctx.studentId), schoolId: oid(ctx.schoolId) })
      .select('documents photo')
      .lean();
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);
    const raw = student.documents && typeof student.documents === 'object' ? student.documents : {};
    const groups = {};
    for (const [key, val] of Object.entries(raw)) {
      groups[key] = (Array.isArray(val) ? val : []).filter(Boolean).map((url, i) => ({
        key,
        index: i,
        name: `${key} ${i + 1}`,
        url,
      }));
    }
    return groups;
  }

  async list(ctx) {
    const groups = await this.#load(ctx);
    return Object.entries(groups).map(([key, items]) => ({ key, count: items.length, items }));
  }

  async group(ctx, key) {
    const groups = await this.#load(ctx);
    const items = groups[String(key)];
    if (!items) throw new AppError('Document group not found', 404, STUDENT_ERR.NOT_FOUND);
    return { key: String(key), count: items.length, items };
  }

  /**
   * Returns a URL the client can fetch. `path` MUST be one of the student's own
   * stored document URLs — an attacker cannot pass `../other-student/x` or an
   * absolute path.
   */
  async downloadUrl(ctx, requestedPath) {
    const wanted = String(requestedPath || '').trim();
    if (!wanted || wanted.includes('..') || wanted.startsWith('//') || path.isAbsolute(wanted)) {
      throw new AppError('Invalid document path', 400, STUDENT_ERR.DOCUMENT_PATH_INVALID);
    }
    const groups = await this.#load(ctx);
    const owned = new Set();
    for (const items of Object.values(groups)) for (const it of items) owned.add(it.url);
    if (!owned.has(wanted)) {
      throw new AppError('You do not have access to this document', 403, STUDENT_ERR.RESOURCE_FORBIDDEN);
    }
    return { url: wanted, expiresIn: null };
  }
}

export const studentDocumentsService = new StudentDocumentsService();
