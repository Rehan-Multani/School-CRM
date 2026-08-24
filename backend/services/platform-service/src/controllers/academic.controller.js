import { academicService } from '../services/academic.service.js';
import { deleteMulterFiles } from '../utils/upload.utils.js';
import { collectTeacherUploadFiles } from '../middleware/uploadTeacherPhoto.js';

function schoolId(req) {
  return req.user?.sub;
}

function parseTeacherBody(body = {}) {
  const parsed = { ...body };
  ['address', 'qualifications', 'experiences', 'documents', 'documentsKeep', 'payroll', 'account', 'attendanceSettings'].forEach((key) => {
    if (typeof parsed[key] === 'string') {
      try {
        parsed[key] = JSON.parse(parsed[key]);
      } catch {
        // keep original string if it is not JSON
      }
    }
  });
  return parsed;
}

export async function listAcademicYears(req, res, next) {
  try {
    const result = await academicService.listYears(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAcademicYear(req, res, next) {
  try {
    const data = await academicService.getYear(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createAcademicYear(req, res, next) {
  try {
    const data = await academicService.createYear(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Academic year created' });
  } catch (error) {
    next(error);
  }
}

export async function updateAcademicYear(req, res, next) {
  try {
    const data = await academicService.updateYear(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Academic year updated' });
  } catch (error) {
    next(error);
  }
}

export async function activateAcademicYear(req, res, next) {
  try {
    const data = await academicService.activateYear(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Academic year activated' });
  } catch (error) {
    next(error);
  }
}

export async function setCurrentAcademicYear(req, res, next) {
  try {
    const data = await academicService.setCurrentYear(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Current academic year updated' });
  } catch (error) {
    next(error);
  }
}

export async function archiveAcademicYear(req, res, next) {
  try {
    const data = await academicService.archiveYear(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Academic year archived' });
  } catch (error) {
    next(error);
  }
}

export async function unarchiveAcademicYear(req, res, next) {
  try {
    const data = await academicService.unarchiveYear(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Academic year unarchived' });
  } catch (error) {
    next(error);
  }
}

export async function completeAcademicYear(req, res, next) {
  try {
    const data = await academicService.completeYear(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Academic year marked as completed' });
  } catch (error) {
    next(error);
  }
}

export async function deleteAcademicYear(req, res, next) {
  try {
    const result = await academicService.deleteYear(schoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listClasses(req, res, next) {
  try {
    const result = await academicService.listClasses(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getClass(req, res, next) {
  try {
    const data = await academicService.getClass(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createClass(req, res, next) {
  try {
    const data = await academicService.createClass(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Class created' });
  } catch (error) {
    next(error);
  }
}

export async function updateClass(req, res, next) {
  try {
    const data = await academicService.updateClass(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Class updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteClass(req, res, next) {
  try {
    const data = await academicService.deleteClass(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Class deactivated' });
  } catch (error) {
    next(error);
  }
}

export async function seedClasses(req, res, next) {
  try {
    const result = await academicService.seedDefaultClasses(schoolId(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listYearClasses(req, res, next) {
  try {
    const data = await academicService.listYearClasses(schoolId(req), req.params.yearId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function addClassToYear(req, res, next) {
  try {
    const data = await academicService.addClassToYear(
      schoolId(req),
      req.params.yearId,
      req.body.classId
    );
    res.status(201).json({ success: true, data, message: 'Class added to academic year' });
  } catch (error) {
    next(error);
  }
}

export async function removeClassFromYear(req, res, next) {
  try {
    const result = await academicService.removeClassFromYear(
      schoolId(req),
      req.params.yearId,
      req.params.classId
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listSections(req, res, next) {
  try {
    const data = await academicService.listSections(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSection(req, res, next) {
  try {
    const data = await academicService.getSection(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createSection(req, res, next) {
  try {
    const data = await academicService.createSection(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Section created' });
  } catch (error) {
    next(error);
  }
}

export async function updateSection(req, res, next) {
  try {
    const data = await academicService.updateSection(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Section updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteSection(req, res, next) {
  try {
    const data = await academicService.deleteSection(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Section deactivated' });
  } catch (error) {
    next(error);
  }
}

export async function listSubjects(req, res, next) {
  try {
    const result = await academicService.listSubjects(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function createSubject(req, res, next) {
  try {
    const data = await academicService.createSubject(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Subject created' });
  } catch (error) {
    next(error);
  }
}

export async function updateSubject(req, res, next) {
  try {
    const data = await academicService.updateSubject(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Subject updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteSubject(req, res, next) {
  try {
    const data = await academicService.deleteSubject(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Subject deactivated' });
  } catch (error) {
    next(error);
  }
}

export async function listAllSectionSubjects(req, res, next) {
  try {
    const data = await academicService.listAllSectionSubjects(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createSectionSubjectDirect(req, res, next) {
  try {
    const data = await academicService.createSectionSubjectDirect(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Subject assigned to section' });
  } catch (error) {
    next(error);
  }
}

export async function listSectionSubjects(req, res, next) {
  try {
    const data = await academicService.listSectionSubjects(schoolId(req), req.params.sectionId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function addSectionSubject(req, res, next) {
  try {
    const data = await academicService.addSectionSubject(
      schoolId(req),
      req.params.sectionId,
      req.body
    );
    res.status(201).json({ success: true, data, message: 'Subject assigned to section' });
  } catch (error) {
    next(error);
  }
}

export async function updateSectionSubject(req, res, next) {
  try {
    const data = await academicService.updateSectionSubject(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Section subject updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteSectionSubject(req, res, next) {
  try {
    const result = await academicService.deleteSectionSubject(schoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listTeachers(req, res, next) {
  try {
    const data = await academicService.listTeachers(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createTeacher(req, res, next) {
  const files = collectTeacherUploadFiles(req);
  try {
    const data = await academicService.createTeacher(schoolId(req), parseTeacherBody(req.body), files);
    res.status(201).json({ success: true, data, message: 'Teacher created' });
  } catch (error) {
    deleteMulterFiles(req.files);
    next(error);
  }
}

export async function getTeacher(req, res, next) {
  try {
    const data = await academicService.getTeacher(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacher(req, res, next) {
  const files = collectTeacherUploadFiles(req);
  try {
    const data = await academicService.updateTeacher(schoolId(req), req.params.id, parseTeacherBody(req.body), files);
    res.json({ success: true, data, message: 'Teacher updated' });
  } catch (error) {
    deleteMulterFiles(req.files);
    next(error);
  }
}

export async function updateTeacherStatus(req, res, next) {
  try {
    const data = await academicService.updateTeacherStatus(schoolId(req), req.params.id, req.body.status);
    const message = req.body.status === 'ACTIVE' ? 'Teacher activated' : 'Teacher status updated';
    res.json({ success: true, data, message });
  } catch (error) {
    next(error);
  }
}

export async function deleteTeacher(req, res, next) {
  try {
    const result = await academicService.deleteTeacher(schoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
