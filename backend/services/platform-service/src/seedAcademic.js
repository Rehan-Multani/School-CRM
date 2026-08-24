import { School } from './models/School.js';
import { Teacher } from './models/Teacher.js';
import { Subject } from './models/Subject.js';

const DEFAULT_TEACHERS = [
  { employeeId: 'TCH-001', name: 'Rahul Sharma', email: 'rahul.sharma@school.local', department: 'Mathematics' },
  { employeeId: 'TCH-002', name: 'Amit Sharma', email: 'amit.sharma@school.local', department: 'Science' },
  { employeeId: 'TCH-003', name: 'Neha Sharma', email: 'neha.sharma@school.local', department: 'English' },
  { employeeId: 'TCH-004', name: 'Pooja Maam', email: 'pooja@school.local', department: 'Hindi' },
  { employeeId: 'TCH-005', name: 'Arjun Sharma', email: 'arjun.sharma@school.local', department: 'Computer Science' },
];

const DEFAULT_SUBJECTS = [
  { name: 'Mathematics', code: 'MATH', subjectType: 'THEORY' },
  { name: 'Science', code: 'SCI', subjectType: 'THEORY' },
  { name: 'English', code: 'ENG', subjectType: 'THEORY' },
  { name: 'Hindi', code: 'HIN', subjectType: 'THEORY' },
  { name: 'Social Science', code: 'SST', subjectType: 'THEORY' },
  { name: 'Computer', code: 'COMP', subjectType: 'PRACTICAL' },
  { name: 'Physical Education', code: 'PE', subjectType: 'ACTIVITY' },
];

export async function seedAcademicTeachers() {
  const schools = await School.find({}).select('_id name');
  let teachersCreated = 0;
  let subjectsCreated = 0;

  for (const school of schools) {
    const existingTeachers = await Teacher.countDocuments({ schoolId: school._id });
    if (existingTeachers === 0) {
      await Teacher.insertMany(
        DEFAULT_TEACHERS.map((teacher) => ({
          schoolId: school._id,
          ...teacher,
          phone: '',
          status: 'ACTIVE',
        }))
      );
      teachersCreated += DEFAULT_TEACHERS.length;
    }

    const existingSubjects = await Subject.countDocuments({ schoolId: school._id });
    if (existingSubjects === 0) {
      await Subject.insertMany(
        DEFAULT_SUBJECTS.map((subject) => ({
          schoolId: school._id,
          ...subject,
          maxMarks: 100,
          passingMarks: 33,
          description: '',
          status: 'ACTIVE',
        }))
      );
      subjectsCreated += DEFAULT_SUBJECTS.length;
    }
  }

  if (teachersCreated > 0) {
    console.log(`Academic teachers seeded: ${teachersCreated}`);
  }
  if (subjectsCreated > 0) {
    console.log(`Academic subjects seeded: ${subjectsCreated}`);
  }
}
