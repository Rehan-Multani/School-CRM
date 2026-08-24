import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { AppError } from '../../../shared/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsRoot = path.resolve(__dirname, '../../uploads');
export const studentUploadsDir = path.join(uploadsRoot, 'students');
export const studentDocumentsDir = path.join(studentUploadsDir, 'documents');
export const teacherUploadsDir = path.join(uploadsRoot, 'teachers');
export const teacherDocumentsDir = path.join(teacherUploadsDir, 'documents');
export const userUploadsDir = path.join(uploadsRoot, 'users');
export const userDocumentsDir = path.join(userUploadsDir, 'documents');

export function ensureUploadDirs() {
  fs.mkdirSync(studentUploadsDir, { recursive: true });
  fs.mkdirSync(studentDocumentsDir, { recursive: true });
  fs.mkdirSync(teacherUploadsDir, { recursive: true });
  fs.mkdirSync(teacherDocumentsDir, { recursive: true });
  fs.mkdirSync(userUploadsDir, { recursive: true });
  fs.mkdirSync(userDocumentsDir, { recursive: true });
}

export function toStudentPhotoPublicPath(filename) {
  return `/uploads/students/${filename}`;
}

export function toStudentDocumentPublicPath(filename) {
  return `/uploads/students/documents/${filename}`;
}

export function toTeacherPhotoPublicPath(filename) {
  return `/uploads/teachers/${filename}`;
}

export function toTeacherDocumentPublicPath(filename) {
  return `/uploads/teachers/documents/${filename}`;
}

export function toUserPhotoPublicPath(filename) {
  return `/uploads/users/${filename}`;
}

export function toUserDocumentPublicPath(filename) {
  return `/uploads/users/documents/${filename}`;
}

export function resolveUploadPath(publicPath) {
  if (!publicPath || typeof publicPath !== 'string') return null;
  const sanitized = publicPath.replace(/^\/+/, '');
  return path.join(uploadsRoot, sanitized.replace(/\//g, path.sep));
}

export function deleteUploadedFile(publicPath) {
  const filePath = resolveUploadPath(publicPath);
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore deletion failure
    }
  }
}

export function listMulterFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files.filter(Boolean);
  if (files.path || files.filename) return [files];
  return Object.values(files)
    .flat()
    .filter(Boolean);
}

export function deleteMulterFiles(files) {
  for (const file of listMulterFiles(files)) {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // Ignore deletion failure
      }
    }
  }
}

/**
 * Universal Image-to-WebP Converter
 * Converts any uploaded image (JPEG, PNG, GIF, BMP, TIFF, SVG, etc.) to optimized WebP.
 *
 * @param {Object} file - Multer file object
 * @param {Object} [options] - Sharp optimization options
 * @returns {Promise<Object>} - Updated Multer file object with .webp extension and mime
 */
export async function convertUploadedImageToWebp(file, options = {}) {
  if (!file?.path) return file;

  const parsed = path.parse(file.path);
  const tempDestPath = path.join(parsed.dir, `${parsed.name}-optimized.webp`);
  const finalDestPath = path.join(parsed.dir, `${parsed.name}.webp`);

  try {
    const image = sharp(file.path, { failOn: 'none' }).rotate(); // Auto-orient based on EXIF

    // Resize if excessive (e.g. > 2000px width/height) to save storage & bandwidth
    const metadata = await image.metadata();
    if (metadata.width > 2048 || metadata.height > 2048) {
      image.resize({
        width: metadata.width > 2048 ? 2048 : undefined,
        height: metadata.height > 2048 ? 2048 : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP with balanced quality and compression
    await image
      .webp({
        quality: options.quality || 82,
        effort: 4,
        lossless: false,
      })
      .toFile(tempDestPath);

    // Remove original uploaded file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Rename optimized WebP to final destination
    if (tempDestPath !== finalDestPath) {
      if (fs.existsSync(finalDestPath)) {
        fs.unlinkSync(finalDestPath);
      }
      fs.renameSync(tempDestPath, finalDestPath);
    }

    // Update Multer file reference
    file.filename = `${parsed.name}.webp`;
    file.path = finalDestPath;
    file.mimetype = 'image/webp';
    return file;
  } catch (error) {
    if (fs.existsSync(tempDestPath)) fs.unlinkSync(tempDestPath);
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new AppError(`Failed to process and convert image to WebP: ${error.message}`, 400);
  }
}

/**
 * Universal Express Middleware to automatically convert ALL uploaded images
 * in req.file or req.files to WebP format.
 */
export async function convertAllUploadedImagesToWebp(req, res, next) {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) files.push(...listMulterFiles(req.files));

    for (const file of files) {
      if (file?.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|tiff|svg)$/i.test(file?.originalname || '')) {
        await convertUploadedImageToWebp(file);
      }
    }
    next();
  } catch (error) {
    if (req.file) deleteMulterFiles(req.file);
    if (req.files) deleteMulterFiles(req.files);
    next(error);
  }
}
