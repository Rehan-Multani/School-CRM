// One ACTIVE Principal per school is now enforced (user.service + a partial unique
// index on SchoolUser). A school that already has several active Principals blocks
// that index from building, so run this once before deploying.
//
//   node src/checkDuplicatePrincipals.mjs            # report only
//   node src/checkDuplicatePrincipals.mjs --apply    # keep the most recently used Principal
//                                                    # per school, set the rest INACTIVE
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { SchoolUser } from './models/SchoolUser.js';

const apply = process.argv.includes('--apply');
await connectDB(env.mongoUri);

const groups = await SchoolUser.aggregate([
  { $match: { role: 'PRINCIPAL', status: 'ACTIVE' } },
  { $group: { _id: '$schoolId', ids: { $push: '$_id' }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
]);

if (!groups.length) {
  console.log('OK - every school has at most one active Principal.');
  process.exit(0);
}

for (const g of groups) {
  const users = await SchoolUser.find({ _id: { $in: g.ids } })
    .select('name email employeeId lastLoginAt createdAt')
    .sort({ lastLoginAt: -1, createdAt: 1 });
  const [keep, ...rest] = users;
  console.log(`\nSchool ${g._id}: ${users.length} active Principals`);
  console.log(`  keep     ${keep.name} <${keep.email}> (${keep.employeeId})`);
  rest.forEach((u) => console.log(`  inactive ${u.name} <${u.email}> (${u.employeeId})`));
  if (apply) {
    await SchoolUser.updateMany({ _id: { $in: rest.map((u) => u._id) } }, { $set: { status: 'INACTIVE' } });
  }
}

console.log(apply ? '\nApplied.' : '\nDry run - re-run with --apply to make the extra Principals INACTIVE.');
process.exit(0);
