import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Parent } from '../models/Parent.js';
import { toStudentPhotoPublicPath, deleteUploadedFile } from '../utils/upload.utils.js';
import { parentSelf } from '../serializers/parent.serializers.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const EDITABLE = ['firstName', 'lastName', 'phone', 'email', 'address'];

const DEFAULT_PREFS = {
  homework: true,
  attendance: true,
  lowAttendance: true,
  exam: true,
  result: true,
  fee: true,
  payment: true,
  notice: true,
  pickup: true,
  transport: true,
  announcement: true,
  communication: true,
};
const KNOWN_KEYS = Object.keys(DEFAULT_PREFS);

class ParentProfileService {
  async #load(ctx) {
    const parent = await Parent.findOne({ _id: oid(ctx.parentId), schoolId: oid(ctx.schoolId) });
    if (!parent) throw new AppError('Parent profile not found', 404, PARENT_ERR.PARENT_NOT_FOUND);
    return parent;
  }

  async get(ctx) {
    const parent = await this.#load(ctx);
    return parentSelf(parent, ctx.children.length);
  }

  async update(ctx, body = {}, files = {}) {
    const parent = await this.#load(ctx);
    for (const key of EDITABLE) {
      if (body[key] !== undefined) {
        let val = String(body[key]).trim().slice(0, 500);
        if (key === 'email') {
          val = val.toLowerCase();
          if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            throw new AppError('email must be a valid email address', 400, PARENT_ERR.VALIDATION_ERROR);
          }
        }
        parent[key] = val;
      }
    }
    if (files.photo) {
      const next = toStudentPhotoPublicPath(files.photo.filename);
      const prev = parent.photo;
      parent.photo = next;
      if (prev && prev !== next) deleteUploadedFile(prev);
    }
    await parent.save();
    return parentSelf(parent, ctx.children.length);
  }

  async getSettings(ctx) {
    const parent = await Parent.findOne({ _id: oid(ctx.parentId), schoolId: oid(ctx.schoolId) })
      .select('notificationPrefs account')
      .lean();
    if (!parent) throw new AppError('Parent profile not found', 404, PARENT_ERR.PARENT_NOT_FOUND);
    return {
      notificationPrefs: { ...DEFAULT_PREFS, ...(parent.notificationPrefs || {}) },
      account: { loginEmail: parent.account?.loginEmail || '' },
    };
  }

  async updateSettings(ctx, body = {}) {
    const incoming = body.notificationPrefs && typeof body.notificationPrefs === 'object' ? body.notificationPrefs : body;
    const patch = {};
    for (const key of KNOWN_KEYS) {
      if (incoming[key] !== undefined) patch[key] = Boolean(incoming[key]);
    }
    if (!Object.keys(patch).length) {
      throw new AppError('No valid notification preference supplied', 400, PARENT_ERR.VALIDATION_ERROR);
    }
    const parent = await this.#load(ctx);
    parent.notificationPrefs = { ...DEFAULT_PREFS, ...(parent.notificationPrefs || {}), ...patch };
    parent.markModified('notificationPrefs');
    await parent.save();
    return { notificationPrefs: parent.notificationPrefs };
  }
}

export const parentProfileService = new ParentProfileService();
