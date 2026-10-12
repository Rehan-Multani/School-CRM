import multer from 'multer';
import { AppError } from '../../../shared/AppError.js';

// School banner upload: one image held in memory; the service resizes and
// re-encodes it, so nothing is written to the (ephemeral) /uploads mount.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.mimetype || '')) {
      cb(new AppError('Only JPG, PNG or WEBP images are allowed', 400));
      return;
    }
    cb(null, true);
  },
});

export const uploadBannerImage = upload.single('image');
