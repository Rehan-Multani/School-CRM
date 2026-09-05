import bcrypt from 'bcryptjs';
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';

async function main() {
  await connectDB(env.mongoUri);
  
  const password = 'Admin@123';
  const passwordHash = await bcrypt.hash(password, 12);

  // 1. Check existing St. Xavier's Academy
  const xavier = await School.findOne({ email: 'admin@stxaviers.ac.in' }).select('+admin.passwordHash') 
    || await School.findOne({ 'admin.email': 'admin@stxaviers.ac.in' }).select('+admin.passwordHash');
  if (xavier) {
    xavier.admin.passwordHash = passwordHash;
    xavier.admin.hasLogin = true;
    xavier.subscriptionPlan = '';
    await xavier.save();
    console.log(`Updated St. Xavier's Academy (admin@stxaviers.ac.in) password to: ${password}, Plan: "${xavier.subscriptionPlan}"`);
  }

  // 2. Create or update a dedicated test school with NO PLAN
  const testSchoolData = {
    name: 'Apex Global Academy',
    code: 'AGA099',
    schoolId: 'apex-global-academy',
    type: 'Private',
    board: 'CBSE',
    establishedYear: 2020,
    website: 'https://apexacademy.edu',
    contact: {
      email: 'contact@apexacademy.edu',
      phone: '+919876543299',
      alternatePhone: '',
      principalName: 'Dr. Rajesh Verma',
    },
    address: {
      line1: 'Plot 45, Knowledge Park III',
      line2: 'Greater Noida',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      pincode: '201310',
    },
    academic: {
      session: '2026-27',
      classFrom: 'Nursery',
      classTo: '12',
      medium: 'English',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    admin: {
      name: 'Rajesh Verma',
      email: 'noplan.admin@school.com',
      mobile: '+919876543299',
      passwordHash: passwordHash,
      hasLogin: true,
    },
    subscriptionPlan: '', // NO PLAN
    status: 'Active',
    createdBy: 'super-admin',
  };

  const saved = await School.findOneAndUpdate(
    { schoolId: testSchoolData.schoolId },
    testSchoolData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('--- Dedicated No-Plan School Ready ---');
  console.log(`School Name: ${saved.name}`);
  console.log(`Code: ${saved.code}`);
  console.log(`School ID: ${saved.schoolId}`);
  console.log(`Admin Email: ${saved.admin.email}`);
  console.log(`Admin Password: ${password}`);
  console.log(`Subscription Plan: "${saved.subscriptionPlan || 'NONE'}"`);
  console.log(`Status: ${saved.status}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

