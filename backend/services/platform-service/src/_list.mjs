import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';

await connectDB(env.mongoUri);
const schools = await School.find().select('name code schoolId subscriptionPlan admin.email');
console.log(JSON.stringify(schools.map(s => ({name:s.name, code:s.code, schoolId:s.schoolId, subscriptionPlan:s.subscriptionPlan, adminEmail:s.admin?.email})), null, 2));
process.exit(0);
