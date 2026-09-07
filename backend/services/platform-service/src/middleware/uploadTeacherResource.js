import fs from 'fs';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../../../shared/AppError.js';
import { ensureUploadDirs, teacherResourcesDir, deleteMulterFiles } from '../utils/upload.utils.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

ensureUploadDirs();

const ALLOWED = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
};

// Magic bytes expected PER extension — a `.png` that starts with `%PDF` is
// rejected, not silently accepted as "some allowed type".
const SIGNATURES_BY_EXT = {
  '.pdf': [Buffer.from('%PDF', 'latin1')],
  '.docx': [Buffer.from('PK\x03\x04', 'latin1'), Buffer.from('PK\x05\x06', 'latin1')],
  '.pptx': [Buffer.from('PK\x03\x04', 'latin1'), Buffer.from('PK\x05\x06', 'latin1')],
  '.doc': [Buffer.from('\xd0\xcf\x11\xe0', 'latin1')],
  '.ppt': [Buffer.from('\xd0\xcf\x11\xe0', 'latin1')],
  '.png': [Buffer.from('\x89PNG', 'latin1')],
  '.jpg': [Buffer.from('\xff\xd8\xff', 'latin1')],
  '.jpeg': [Buffer.from('\xff\xd8\xff', 'latin1')],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, teacherResourcesDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || '').toLowerCase() || '.bin').slice(0, 6);
    const base =
      path
        .basename(file.originalname || 'file', path.extname(file.originalname || ''))
        .replace(/[^a-z0-9_-]/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 40)
        .toLowerCase() || 'file';
    cb(null, `material-${base}-${crypto.randomBytes(10).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedMimes = ALLOWED[ext];
    if (!allowedMimes) {
      cb(new AppError(`File type ${ext || '(none)'} is not allowed`, 400, TEACHER_ERR.UPLOAD_REJECTED));
      return;
    }
    // Reject an obvious extension/mime mismatch up front; the magic-byte check
    // below is the real gate once the bytes are on disk.
    if (file.mimetype && !allowedMimes.includes(file.mimetype) && !file.mimetype.startsWith('application/octet-stream')) {
      cb(new AppError('File content type does not match its extension', 400, TEACHER_ERR.UPLOAD_REJECTED));
      return;
    }
    cb(null, true);
  },
});

export const uploadMaterialFile = upload.single('file');

/** Runs after multer: verify the bytes actually start with an allowed signature. */
export function verifyMaterialFile(req, _res, next) {
  const file = req.file;
  if (!file) return next(); // file optional on PATCH; service enforces on POST
  try {
    const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
    const expected = SIGNATURES_BY_EXT[ext];
    const fd = fs.openSync(file.path, 'r');
    const head = Buffer.alloc(8);
    fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    const ok = Array.isArray(expected) && expected.some((sig) => head.subarray(0, sig.length).equals(sig));
    if (!ok) {
      deleteMulterFiles(req.file);
      req.file = undefined;
      return next(new AppError('This file could not be verified as a document or image', 400, TEACHER_ERR.UPLOAD_REJECTED));
    }
    next();
  } catch {
    deleteMulterFiles(req.file);
    req.file = undefined;
    next(new AppError('Uploaded file could not be read', 400, TEACHER_ERR.UPLOAD_REJECTED));
  }
}

export function materialFileMeta(file) {
  if (!file) return null;
  const ext = path.extname(file.originalname || file.filename || '').replace('.', '').toLowerCase();
  return {
    fileName: file.originalname || file.filename,
    fileType: ext,
    fileSize: file.size || 0,
  };
}
