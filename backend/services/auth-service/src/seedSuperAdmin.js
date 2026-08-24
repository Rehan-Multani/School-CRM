import bcrypt from 'bcryptjs';
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { SuperAdminUser } from './models/SuperAdminUser.js';

const BCRYPT_ROUNDS = 12;

export async function seedSuperAdmin() {
  const { email, password, name } = env.superAdmin;
  const existing = await SuperAdminUser.findOne({ email });
  if (existing) {
    return existing.toSafeJSON();
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const admin = await SuperAdminUser.create({
    name,
    email,
    passwordHash,
    role: 'SuperAdmin',
  });

  return admin.toSafeJSON();
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedSuperAdmin.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedSuperAdmin())
    .then((admin) => {
      console.log('Super Admin seeded in auth-service');
      console.log(`  Email: ${admin.email}`);
      console.log(`  Name : ${admin.name}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error.message);
      process.exit(1);
    });
}
