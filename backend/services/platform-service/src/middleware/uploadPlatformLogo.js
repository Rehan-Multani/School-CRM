import multer from 'multer';
import { AppError } from '../../../shared/AppError.js';

// Platform logo upload — a single image, held in memory (never written to
// disk). The service re-encodes it to a small WebP data URI stored on the
// PlatformSetting doc, so nothing here touches the ephemeral /uploads mount.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      cb(new AppError('Only image files are allowed for the platform logo', 400));
      return;
    }
    cb(null, true);
  },
});

export const uploadPlatformLogo = upload.single('logo');
