import multer from 'multer';
import { AppError } from '../../../shared/AppError.js';

// Bulk student CSV import — a single small text file, held in memory and
// parsed by the service; nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    if (!name.endsWith('.csv')) {
      cb(new AppError('Only .csv files are allowed', 400));
      return;
    }
    cb(null, true);
  },
});

export function uploadCsv(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    if (error?.code === 'LIMIT_FILE_SIZE') return next(new AppError('CSV file must be 2MB or smaller', 400));
    return next(new AppError(error.message || 'Upload failed', 400));
  });
}
