import { studentService } from '../services/student.service.js';
import { deleteUploadedFile, toStudentPhotoPublicPath, toStudentDocumentPublicPath } from '../utils/upload.utils.js';
import { collectStudentUploadFiles } from '../middleware/uploadStudentPhoto.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub;
}

function cleanupStudentUploadFiles(files) {
  if (!files) return;
  if (files.photo) deleteUploadedFile(toStudentPhotoPublicPath(files.photo.filename));
  if (files.aadhaar) {
    files.aadhaar.forEach((f) => deleteUploadedFile(toStudentDocumentPublicPath(f.filename)));
  }
  if (files.marksheet) {
    files.marksheet.forEach((f) => deleteUploadedFile(toStudentDocumentPublicPath(f.filename)));
  }
}

export async function listStudents(req, res, next) {
  try {
    const data = await studentService.listStudents(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudent(req, res, next) {
  try {
    const data = await studentService.getStudent(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createStudent(req, res, next) {
  const files = collectStudentUploadFiles(req);
  try {
    const data = await studentService.createStudent(schoolId(req), req.body, files);
    res.status(201).json({ success: true, data, message: 'Student created' });
  } catch (error) {
    cleanupStudentUploadFiles(files);
    next(error);
  }
}

export async function updateStudent(req, res, next) {
  const files = collectStudentUploadFiles(req);
  try {
    const data = await studentService.updateStudent(schoolId(req), req.params.id, req.body, files);
    res.json({ success: true, data, message: 'Student updated' });
  } catch (error) {
    cleanupStudentUploadFiles(files);
    next(error);
  }
}

export async function updateStudentStatus(req, res, next) {
  try {
    const data = await studentService.updateStudentStatus(schoolId(req), req.params.id, req.body.status);
    res.json({ success: true, data, message: `Student ${String(req.body.status || '').toLowerCase()}d` });
  } catch (error) {
    next(error);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const result = await studentService.deleteStudent(schoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
