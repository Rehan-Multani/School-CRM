import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';
import { SchoolSubscription } from './models/SchoolSubscription.js';
import { razorpaySubscriptionService } from './services/razorpaySubscription.service.js';

await connectDB(env.mongoUri);

const subs = await SchoolSubscription.find({ razorpaySubscriptionId: { $ne: '' } });
const byCustomer = new Map();
for (const s of subs) {
  const key = s.razorpayCustomerId || '(none)';
  if (!byCustomer.has(key)) byCustomer.set(key, []);
  byCustomer.get(key).push(s);
}

for (const [customerId, list] of byCustomer) {
  if (list.length <= 1) continue;
  console.log(`\nrazorpayCustomerId=${customerId} is shared by ${list.length} subscriptions across schools:`, list.map((s) => s.schoolId.toString()));

  for (const sub of list) {
    const school = await School.findById(sub.schoolId);
    if (!school) continue;
    console.log(`\n  Repairing school "${school.name}" (${school._id})...`);
    // Force a fresh lookup/creation ignoring whatever bad id is cached, using
    // the now-fixed findOrCreateCustomer (fail_existing: '0').
    const correct = await razorpaySubscriptionService.findOrCreateCustomer({
      name: school.name,
      email: school.contact?.email || school.email || undefined,
      contact: school.contact?.phone || school.phone || undefined,
      notes: { schoolId: String(school._id), schoolCode: school.schoolId || '' },
    });
    console.log(`  -> correct razorpayCustomerId for this school: ${correct.id} (email=${correct.email}, contact=${correct.contact})`);

    school.razorpayCustomerId = correct.id;
    await school.save();
    sub.razorpayCustomerId = correct.id;
    await sub.save();
    console.log(`  -> updated School.razorpayCustomerId and SchoolSubscription(${sub._id}).razorpayCustomerId`);
  }
}

console.log('\ndone');
process.exit(0);
