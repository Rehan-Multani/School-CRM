import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../../../shared/AppError.js';
import {
  ensureUploadDirs,
  studentUploadsDir,
  studentDocumentsDir,
  convertUploadedImageToWebp,
  deleteMulterFiles,
  listMulterFiles,
} from '../utils/upload.utils.js';

ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === 'photo' ? studentUploadsDir : studentDocumentsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const prefix = file.fieldname === 'photo' ? 'student-photo' : 'student-doc';
    const safeBase = path
      .basename(file.originalname || prefix, ext)
      .replace(/[^a-z0-9_-]/gi, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)
      .toLowerCase() || prefix;
    cb(null, `${safeBase}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 7,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      cb(new AppError('Only image files are allowed', 400));
      return;
    }
    cb(null, true);
  },
});

export const uploadStudentFiles = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadhaarDocuments', maxCount: 2 },
  { name: 'marksheetDocuments', maxCount: 2 },
]);

export async function convertStudentImages(req, _res, next) {
  try {
    const files = listMulterFiles(req.files);
    for (const file of files) {
      await convertUploadedImageToWebp(file);
    }
    next();
  } catch {
    deleteMulterFiles(req.files);
    next(new AppError('Please upload a valid image. Files are converted to WebP after upload.', 400));
  }
}

export function collectStudentUploadFiles(req) {
  return {
    photo: req.files?.photo?.[0] || null,
    aadhaar: req.files?.aadhaarDocuments || [],
    marksheet: req.files?.marksheetDocuments || [],
  };
}
