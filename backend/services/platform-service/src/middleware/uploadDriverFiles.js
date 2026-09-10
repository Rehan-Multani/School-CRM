import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../../../shared/AppError.js';
import {
  ensureUploadDirs,
  driverUploadsDir,
  driverDocumentsDir,
  convertUploadedImageToWebp,
  deleteMulterFiles,
  listMulterFiles,
  toDriverPhotoPublicPath,
  toDriverLicensePublicPath,
} from '../utils/upload.utils.js';

ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === 'photo' ? driverUploadsDir : driverDocumentsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const prefix = file.fieldname === 'photo' ? 'driver-photo' : 'driver-license';
    const safeBase =
      path
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
    fileSize: 10 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (_req, file, cb) => {
    const isImageMime = file.mimetype?.startsWith('image/');
    const isImageExt = /\.(jpg|jpeg|png|webp|gif|bmp|tiff|jfif|avif|heic|heif|svg)$/i.test(
      file.originalname || ''
    );
    if (!isImageMime && !isImageExt) {
      cb(new AppError('Only image files are allowed for driver photo and license', 400));
      return;
    }
    cb(null, true);
  },
});

export const uploadDriverFiles = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'licenseImage', maxCount: 1 },
]);

export async function convertDriverImages(req, _res, next) {
  try {
    const files = listMulterFiles(req.files);
    for (const file of files) {
      await convertUploadedImageToWebp(file);
    }
    next();
  } catch (err) {
    console.error('convertDriverImages error:', err);
    deleteMulterFiles(req.files);
    next(
      err instanceof AppError
        ? err
        : new AppError(err?.message || 'Please upload valid images. Files are converted to WebP format.', 400)
    );
  }
}

export function collectDriverUploadFiles(req) {
  return {
    photo: req.files?.photo?.[0] ? toDriverPhotoPublicPath(req.files.photo[0].filename) : undefined,
    licenseImage: req.files?.licenseImage?.[0]
      ? toDriverLicensePublicPath(req.files.licenseImage[0].filename)
      : undefined,
  };
}
