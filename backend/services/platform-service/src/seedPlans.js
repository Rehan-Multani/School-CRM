import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { SubscriptionPlan } from './models/SubscriptionPlan.js';
import { School } from './models/School.js';

export const DEFAULT_PLANS = [
  {
    name: 'Basic Plan',
    price: 99,
    planType: 'Weekly',
    features: [
      'Up to 500 students',
      '50 GB storage',
      'Student, teacher, and parent modules',
      'Attendance and homework',
      'Email support',
    ],
  },
  {
    name: 'Growth Plan',
    price: 249,
    planType: 'Monthly',
    features: [
      'Up to 1,500 students',
      '200 GB storage',
      'Fees, exams, and library modules',
      'Priority email and chat support',
      'Custom branding',
    ],
  },
  {
    name: 'Enterprise Plan',
    price: 599,
    planType: 'Yearly',
    features: [
      'Up to 5,000 students',
      '1 TB storage',
      'Transport, hostel, payroll, and analytics',
      'Dedicated 24/7 account manager',
      'Custom domain and branding',
    ],
  },
];

export async function seedSubscriptionPlans() {
  const seeded = [];

  for (const plan of DEFAULT_PLANS) {
    const saved = await SubscriptionPlan.findOneAndUpdate(
      { name: plan.name },
      { ...plan, createdBy: 'seed' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    seeded.push(saved.toPublicJSON());
  }

  return seeded;
}

export async function clearUnselectedSchoolPlans() {
  const result = await School.updateMany(
    { subscriptionPlan: { $in: ['Basic', 'Growth', 'Enterprise'] } },
    { $set: { subscriptionPlan: '' } }
  );
  return result.modifiedCount || 0;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedPlans.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedSubscriptionPlans())
    .then((plans) => {
      console.log(`Seeded ${plans.length} subscription plans`);
      plans.forEach((plan) => {
        console.log(`  ${plan.name} · ₹${plan.price} / ${plan.planType}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('Plan seed failed:', error.message);
      process.exit(1);
    });
}
