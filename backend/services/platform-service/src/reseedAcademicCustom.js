import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';
import { Teacher } from './models/Teacher.js';
import { Student } from './models/Student.js';
import { StudentEnrollment } from './models/StudentEnrollment.js';
import { Section } from './models/Section.js';
import { SectionSubject } from './models/SectionSubject.js';
import { SchoolClass } from './models/SchoolClass.js';
import { AcademicYear } from './models/AcademicYear.js';
import { AcademicYearClass } from './models/AcademicYearClass.js';

const NEW_TEACHERS = [
  {
    employeeId: 'TCH-101',
    name: 'Aarav Patel',
    email: 'aarav.patel@school.local',
    department: 'Mathematics',
    gender: 'MALE',
    dateOfBirth: new Date('1990-05-15'),
    joiningDate: new Date('2020-07-01'),
    phone: '9876543210',
    mobileNumber: '9876543210',
    experienceSummary: '6 Years of Teaching Experience',
    address: {
      addressLine: 'Flat 402, Royal Residency, Sector 12',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      pincode: '201301'
    },
    qualifications: [
      {
        degree: 'M.Sc. Mathematics',
        specialization: 'Applied Mathematics',
        institution: 'Delhi University',
        passingYear: 2015
      },
      {
        degree: 'B.Ed.',
        specialization: 'Mathematics Teaching',
        institution: 'IGNOU',
        passingYear: 2017
      }
    ]
  },
  {
    employeeId: 'TCH-102',
    name: 'Kabir Singh',
    email: 'kabir.singh@school.local',
    department: 'Science',
    gender: 'MALE',
    dateOfBirth: new Date('1988-10-22'),
    joiningDate: new Date('2019-06-15'),
    phone: '9876543211',
    mobileNumber: '9876543211',
    experienceSummary: '7 Years of teaching Physics and Chemistry',
    address: {
      addressLine: 'H.No. 45, Green Park Colony',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      pincode: '122001'
    },
    qualifications: [
      {
        degree: 'B.Sc. Physics',
        specialization: 'Pure Physics',
        institution: 'Mumbai University',
        passingYear: 2010
      },
      {
        degree: 'M.Sc. Physics',
        specialization: 'Astro-Physics',
        institution: 'IIT Bombay',
        passingYear: 2012
      }
    ]
  },
  {
    employeeId: 'TCH-103',
    name: 'Diya Sen',
    email: 'diya.sen@school.local',
    department: 'English',
    gender: 'FEMALE',
    dateOfBirth: new Date('1993-03-08'),
    joiningDate: new Date('2021-09-01'),
    phone: '9876543212',
    mobileNumber: '9876543212',
    experienceSummary: '4 Years in Creative Writing and English Lit',
    address: {
      addressLine: 'Apt 12B, Sky Heights, Salt Lake',
      city: 'Kolkata',
      state: 'West Bengal',
      country: 'India',
      pincode: '700091'
    },
    qualifications: [
      {
        degree: 'B.A. English',
        specialization: 'English Literature',
        institution: 'Presidency University',
        passingYear: 2014
      },
      {
        degree: 'M.A. English',
        specialization: 'Modern Literature',
        institution: 'Jadavpur University',
        passingYear: 2016
      }
    ]
  },
  {
    employeeId: 'TCH-104',
    name: 'Ishaan Nair',
    email: 'ishaan.nair@school.local',
    department: 'Hindi',
    gender: 'MALE',
    dateOfBirth: new Date('1985-12-01'),
    joiningDate: new Date('2018-04-10'),
    phone: '9876543213',
    mobileNumber: '9876543213',
    experienceSummary: '8 Years teaching Hindi and Sanskrit literature',
    address: {
      addressLine: '22, Nilgiri Block, Sector 4',
      city: 'Indore',
      state: 'Madhya Pradesh',
      country: 'India',
      pincode: '452001'
    },
    qualifications: [
      {
        degree: 'B.A. Hindi',
        specialization: 'Hindi Literature',
        institution: 'BHU Varanasi',
        passingYear: 2007
      },
      {
        degree: 'M.A. Hindi',
        specialization: 'Hindi Vyakaran',
        institution: 'BHU Varanasi',
        passingYear: 2009
      }
    ]
  },
  {
    employeeId: 'TCH-105',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@school.local',
    department: 'Computer Science',
    gender: 'FEMALE',
    dateOfBirth: new Date('1994-07-19'),
    joiningDate: new Date('2022-01-15'),
    phone: '9876543214',
    mobileNumber: '9876543214',
    experienceSummary: '3 Years teaching Web Technologies & Python coding',
    address: {
      addressLine: 'Flat G1, Green Meadows, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560034'
    },
    qualifications: [
      {
        degree: 'B.Tech CSE',
        specialization: 'Computer Science',
        institution: 'PES University',
        passingYear: 2016
      },
      {
        degree: 'M.Tech CSE',
        specialization: 'Data Science',
        institution: 'IISc Bengaluru',
        passingYear: 2019
      }
    ]
  }
];

const NEW_STUDENTS = [
  {
    admissionNumber: 'ADM-101',
    firstName: 'Vivaan',
    lastName: 'Roy',
    gender: 'MALE',
    email: 'vivaan.roy@school.local',
    phone: '9876543201',
    parentName: 'Raman Roy',
    parentPhone: '9876543201',
    address: '123 Main St, Sector 2, Noida, Uttar Pradesh - 201301',
    dateOfBirth: new Date('2011-04-12')
  },
  {
    admissionNumber: 'ADM-102',
    firstName: 'Kiara',
    lastName: 'Joshi',
    gender: 'FEMALE',
    email: 'kiara.joshi@school.local',
    phone: '9876543202',
    parentName: 'Deepak Joshi',
    parentPhone: '9876543202',
    address: '456 Oak Ave, Sector 15, Gurugram, Haryana - 122001',
    dateOfBirth: new Date('2011-08-23')
  },
  {
    admissionNumber: 'ADM-103',
    firstName: 'Reyansh',
    lastName: 'Verma',
    gender: 'MALE',
    email: 'reyansh.verma@school.local',
    phone: '9876543203',
    parentName: 'Sanjay Verma',
    parentPhone: '9876543203',
    address: '789 Pine Rd, Indiranagar, Bengaluru, Karnataka - 560038',
    dateOfBirth: new Date('2011-02-15')
  },
  {
    admissionNumber: 'ADM-104',
    firstName: 'Saisha',
    lastName: 'Gupta',
    gender: 'FEMALE',
    email: 'saisha.gupta@school.local',
    phone: '9876543204',
    parentName: 'Anil Gupta',
    parentPhone: '9876543204',
    address: '321 Maple Dr, Salt Lake, Kolkata, West Bengal - 700091',
    dateOfBirth: new Date('2011-11-05')
  },
  {
    admissionNumber: 'ADM-105',
    firstName: 'Sai',
    lastName: 'Reddy',
    gender: 'MALE',
    email: 'sai.reddy@school.local',
    phone: '9876543205',
    parentName: 'Prasad Reddy',
    parentPhone: '9876543205',
    address: '654 Elm St, Gachibowli, Hyderabad, Telangana - 500032',
    dateOfBirth: new Date('2011-09-30')
  }
];

async function reseed() {
  await connectDB(env.mongoUri);
  console.log('Connected to MongoDB');

  // 1. Delete all teacher & student dependents / records
  console.log('Clearing old teachers, students, enrollments, section subjects, and updating class teacher references...');
  await Section.updateMany({}, { classTeacherId: null });
  await SectionSubject.deleteMany({});
  await StudentEnrollment.deleteMany({});
  await Student.deleteMany({});
  await Teacher.deleteMany({});
  console.log('Cleared successfully');

  const schools = await School.find({});
  if (schools.length === 0) {
    console.log('No schools found. Please seed schools first.');
    process.exit(0);
  }

  for (const school of schools) {
    console.log(`Processing school: ${school.name}`);

    // Create 5 new teachers
    const teachers = await Teacher.insertMany(
      NEW_TEACHERS.map((teacher) => ({
        schoolId: school._id,
        ...teacher,
        status: 'ACTIVE'
      }))
    );
    console.log(`Seeded 5 teachers for ${school.name}`);

    // Find or create AcademicYear
    let academicYear = await AcademicYear.findOne({ schoolId: school._id, status: 'ACTIVE' });
    if (!academicYear) {
      academicYear = await AcademicYear.findOne({ schoolId: school._id });
    }
    if (!academicYear) {
      academicYear = await AcademicYear.create({
        schoolId: school._id,
        name: '2026-27',
        code: '2026-27',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        status: 'ACTIVE',
        isCurrent: true
      });
      console.log(`Created default Academic Year for ${school.name}`);
    }

    // Find or create SchoolClass
    let schoolClass = await SchoolClass.findOne({ schoolId: school._id, status: 'ACTIVE' });
    if (!schoolClass) {
      schoolClass = await SchoolClass.findOne({ schoolId: school._id });
    }
    if (!schoolClass) {
      schoolClass = await SchoolClass.create({
        schoolId: school._id,
        name: 'Class 10',
        code: 'CL10',
        numericOrder: 10,
        description: 'Class 10th standard',
        status: 'ACTIVE'
      });
      console.log(`Created default Class 10 for ${school.name}`);
    }

    // Map academic year to class if not mapped
    const mapping = await AcademicYearClass.findOne({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: schoolClass._id
    });
    if (!mapping) {
      await AcademicYearClass.create({
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: schoolClass._id,
        status: 'ACTIVE'
      });
      console.log(`Mapped Academic Year to Class for ${school.name}`);
    }

    // Find or create Section
    let section = await Section.findOne({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: schoolClass._id,
      status: 'ACTIVE'
    });
    if (!section) {
      section = await Section.findOne({
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: schoolClass._id
      });
    }
    if (!section) {
      section = await Section.create({
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: schoolClass._id,
        name: 'Section A',
        code: 'A',
        capacity: 40,
        roomNumber: '101',
        classTeacherId: teachers[0]._id, // Assign first teacher as Class Teacher
        status: 'ACTIVE'
      });
      console.log(`Created default Section A for ${school.name}`);
    } else {
      // update section to have class teacher
      section.classTeacherId = teachers[0]._id;
      await section.save();
    }

    // Create 5 new students and enroll them
    const students = await Student.insertMany(
      NEW_STUDENTS.map((student) => ({
        schoolId: school._id,
        ...student,
        status: 'ACTIVE'
      }))
    );
    console.log(`Seeded 5 students for ${school.name}`);

    // Create enrollments for them
    const enrollments = [];
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      enrollments.push({
        schoolId: school._id,
        studentId: student._id,
        academicYearId: academicYear._id,
        classId: schoolClass._id,
        sectionId: section._id,
        rollNumber: String(i + 1),
        admissionNumber: student.admissionNumber,
        status: 'ACTIVE',
        enrollmentDate: new Date()
      });
    }
    await StudentEnrollment.insertMany(enrollments);
    console.log(`Enrolled 5 students in class/section for ${school.name}`);
  }

  console.log('Reseeding complete!');
  process.exit(0);
}

reseed().catch((err) => {
  console.error('Error during reseeding:', err);
  process.exit(1);
});
