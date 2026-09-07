/**
 * Compact DTOs for the Parent APK. Child *academic* data is serialized by the
 * shared student serializers (src/serializers/student.serializers.js) — this
 * file only shapes parent-specific things (the parent, the child summary card).
 */

export function parentSelf(parent = {}, childCount = 0) {
  const p = typeof parent.toPublicJSON === 'function' ? parent.toPublicJSON() : parent;
  return {
    id: String(p.id || p._id),
    name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    email: p.email || p.account?.loginEmail || '',
    phone: p.phone || '',
    photo: p.photo || '',
    address: p.address || '',
    status: p.status || 'ACTIVE',
    childCount,
    mustResetPassword: Boolean(p.mustResetPassword),
  };
}

/**
 * One row of the child selector / My Children list. `student` is the lean
 * Student doc, `link` the ParentStudent doc, `enr` the current enrollment (+
 * class/section names) resolved by parentAccess.
 */
export function childCard(student = {}, link = {}, enr = {}) {
  const s = typeof student.toPublicJSON === 'function' ? student.toPublicJSON() : student;
  const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.fullName || '';
  return {
    childId: String(s.id || s._id),
    name: fullName,
    photo: s.photo || '',
    admissionNumber: s.admissionNumber || '',
    relationship: link.relationship || 'GUARDIAN',
    isPrimary: Boolean(link.isPrimary),
    classId: enr.classId || null,
    className: enr.className || '',
    sectionId: enr.sectionId || null,
    sectionName: enr.sectionName || '',
    rollNumber: enr.rollNumber || '',
    academicYear: enr.academicYearName || '',
    status: s.status || 'ACTIVE',
  };
}

/** Full read-only child profile (My Children → tap). */
export function childProfile(student = {}, link = {}, enr = {}) {
  const s = typeof student.toPublicJSON === 'function' ? student.toPublicJSON() : student;
  return {
    ...childCard(s, link, enr),
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    gender: s.gender || 'OTHER',
    dateOfBirth: s.dateOfBirth || null,
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
  };
}
