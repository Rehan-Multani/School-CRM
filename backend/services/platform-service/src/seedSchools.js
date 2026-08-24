import bcrypt from 'bcryptjs';
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DEFAULT_SCHOOLS = [
  {
    name: 'Greenfield Public School',
    code: 'GPS001',
    schoolId: 'greenfield-public-school',
    type: 'Private',
    board: 'CBSE',
    establishedYear: 2008,
    website: 'https://greenfield.edu',
    contact: {
      email: 'info@greenfield.edu',
      phone: '+919876543210',
      alternatePhone: '+919876543211',
      principalName: 'Dr. S. Chatterjee',
    },
    address: {
      line1: '12 Education Avenue',
      line2: 'Sector 18',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      pincode: '201301',
    },
    academic: {
      session: '2026-27',
      classFrom: 'Nursery',
      classTo: '12',
      medium: 'English',
      workingDays: WORKING_DAYS,
    },
    admin: {
      name: 'Vikramaditya Rao',
      email: 'admin@greenfield.edu',
      mobile: '+919876543210',
    },
    status: 'Active',
  },
  {
    name: "St. Xavier's Academy",
    code: 'SXA002',
    schoolId: 'st-xaviers-academy',
    type: 'Private',
    board: 'ICSE',
    establishedYear: 1996,
    website: 'https://stxaviers.ac.in',
    contact: {
      email: 'office@stxaviers.ac.in',
      phone: '+919812345678',
      alternatePhone: '',
      principalName: 'Fr. Michael Dsouza',
    },
    address: {
      line1: '45 Hill Road',
      line2: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400050',
    },
    academic: {
      session: '2026-27',
      classFrom: '1',
      classTo: '12',
      medium: 'English',
      workingDays: WORKING_DAYS,
    },
    admin: {
      name: 'Anita Fernandes',
      email: 'admin@stxaviers.ac.in',
      mobile: '+919812345678',
    },
    status: 'Active',
  },
  {
    name: 'Delhi Public School Jaipur',
    code: 'DPS003',
    schoolId: 'dps-jaipur',
    type: 'Private',
    board: 'CBSE',
    establishedYear: 2003,
    website: 'https://dpsjaipur.edu.in',
    contact: {
      email: 'info@dpsjaipur.edu.in',
      phone: '+919414567890',
      alternatePhone: '+919414567891',
      principalName: 'Mrs. Kavita Sharma',
    },
    address: {
      line1: 'Ajmer Road',
      line2: 'Mansarovar',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      pincode: '302020',
    },
    academic: {
      session: '2026-27',
      classFrom: 'Nursery',
      classTo: '12',
      medium: 'English + Hindi',
      workingDays: WORKING_DAYS,
    },
    admin: {
      name: 'Rohit Sharma',
      email: 'admin@dpsjaipur.edu.in',
      mobile: '+919414567890',
    },
    status: 'Active',
  },
  {
    name: 'Kendriya Vidyalaya Bengaluru',
    code: 'KVB004',
    schoolId: 'kv-bengaluru',
    type: 'Government',
    board: 'CBSE',
    establishedYear: 1984,
    website: 'https://kvbengaluru.ac.in',
    contact: {
      email: 'principal@kvbengaluru.ac.in',
      phone: '+919845001122',
      alternatePhone: '',
      principalName: 'Mr. Ramesh Iyer',
    },
    address: {
      line1: 'MG Road Campus',
      line2: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
    academic: {
      session: '2026-27',
      classFrom: '1',
      classTo: '12',
      medium: 'English + Hindi',
      workingDays: WORKING_DAYS,
    },
    admin: {
      name: 'Suresh Kumar',
      email: 'admin@kvbengaluru.ac.in',
      mobile: '+919845001122',
    },
    status: 'Active',
  },
  {
    name: 'Sunrise International School',
    code: 'SIS005',
    schoolId: 'sunrise-international',
    type: 'International',
    board: 'IB',
    establishedYear: 2015,
    website: 'https://sunriseintl.edu',
    contact: {
      email: 'admissions@sunriseintl.edu',
      phone: '+919001223344',
      alternatePhone: '+919001223345',
      principalName: 'Ms. Priya Nair',
    },
    address: {
      line1: 'Cyber City',
      line2: 'Phase 2',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      pincode: '122002',
    },
    academic: {
      session: '2026-27',
      classFrom: 'Nursery',
      classTo: '12',
      medium: 'English',
      workingDays: WORKING_DAYS,
    },
    admin: {
      name: 'Arjun Mehta',
      email: 'admin@sunriseintl.edu',
      mobile: '+919001223344',
    },
    status: 'Trial',
  },
];

export async function seedSchools() {
  const seeded = [];
  const defaultPasswordHash = await bcrypt.hash('Admin@123', 12);

  for (const school of DEFAULT_SCHOOLS) {
    const existing = await School.findOne({ schoolId: school.schoolId }).select('+admin.passwordHash');
    const passwordHash = existing?.admin?.passwordHash || defaultPasswordHash;
    const saved = await School.findOneAndUpdate(
      { schoolId: school.schoolId },
      {
        ...school,
        admin: { ...school.admin, passwordHash, hasLogin: true },
        subscriptionPlan: existing?.subscriptionPlan || '',
        createdBy: existing?.createdBy || 'seed',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    seeded.push(saved.toPublicJSON());
  }

  return seeded;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedSchools.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedSchools())
    .then((schools) => {
      console.log(`Seeded ${schools.length} schools`);
      schools.forEach((school) => {
        console.log(`  ${school.name} · ${school.code}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('School seed failed:', error.message);
      process.exit(1);
    });
}
