import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';
import { SupportTicket } from './models/SupportTicket.js';

const SEED_TICKETS = [
  {
    schoolId: 'greenfield-public-school',
    subject: 'Unable to generate fee receipts for Class 10',
    description:
      'Parents of Class 10-A are not receiving fee receipts after UPI payment. The receipt page stays on loading. Please check the billing module for this session.',
    category: 'Billing',
    priority: 'High',
    status: 'Open',
    createdByRole: 'SchoolAdmin',
    createdByName: 'Vikramaditya Rao',
    createdByEmail: 'admin@greenfield.edu',
    assignedTo: 'Support Desk',
  },
  {
    schoolId: 'st-xaviers-academy',
    subject: 'Teacher login failing after password reset',
    description:
      'Three teachers cannot sign in after we reset passwords from User Management. They see "Invalid credentials" even with the new password.',
    category: 'Account',
    priority: 'Critical',
    status: 'In Progress',
    createdByRole: 'SchoolAdmin',
    createdByName: 'Anita Fernandes',
    createdByEmail: 'admin@stxaviers.ac.in',
    assignedTo: 'Support Desk',
  },
  {
    schoolId: 'dps-jaipur',
    subject: 'Request transport GPS tracking for new routes',
    description:
      'We added two new pickup routes this session. Super Admin, please enable live GPS tracking on those routes and confirm parent app visibility.',
    category: 'Feature Request',
    priority: 'Medium',
    status: 'Open',
    createdByRole: 'SuperAdmin',
    createdByName: 'Super Admin',
    createdByEmail: 'superadmin@gmail.com',
    assignedTo: 'Product Team',
  },
  {
    schoolId: 'kv-bengaluru',
    subject: 'Attendance sync delay on mobile app',
    description:
      'Attendance marked on the teacher app appears in the admin panel after 20–30 minutes. Need this near real-time before the next inspection.',
    category: 'Technical',
    priority: 'Medium',
    status: 'Resolved',
    createdByRole: 'SchoolAdmin',
    createdByName: 'Suresh Kumar',
    createdByEmail: 'admin@kvbengaluru.ac.in',
    assignedTo: 'Developer Team',
  },
];

export async function seedSupportTickets() {
  const existing = await SupportTicket.countDocuments();
  if (existing > 0) {
    return existing;
  }

  for (const [index, item] of SEED_TICKETS.entries()) {
    const school = await School.findOne({ schoolId: item.schoolId });
    if (!school) continue;

    const resolved = item.status === 'Resolved';
    await SupportTicket.create({
      ticketNo: `TCK-${String(index + 1).padStart(4, '0')}`,
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.name,
      subject: item.subject,
      description: item.description,
      category: item.category,
      priority: item.priority,
      status: item.status,
      createdByRole: item.createdByRole,
      createdByName: item.createdByName,
      createdByEmail: item.createdByEmail,
      assignedTo: item.assignedTo,
      messages: [
        {
          authorRole: item.createdByRole,
          authorName: item.createdByName,
          body: item.description,
        },
        ...(item.status === 'In Progress'
          ? [
              {
                authorRole: 'SuperAdmin',
                authorName: 'Super Admin',
                body: 'We have received this ticket and are checking teacher accounts now. We will update you shortly.',
              },
            ]
          : []),
        ...(resolved
          ? [
              {
                authorRole: 'SuperAdmin',
                authorName: 'Super Admin',
                body: 'Attendance sync interval has been reduced. Please mark a test attendance and confirm on the admin panel.',
              },
            ]
          : []),
      ],
      resolvedAt: resolved ? new Date() : null,
      resolvedBy: resolved ? 'Super Admin' : null,
    });
  }

  return SupportTicket.countDocuments();
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedSupport.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedSupportTickets())
    .then((count) => {
      console.log(`Support tickets seeded: ${count}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Support seed failed:', error.message);
      process.exit(1);
    });
}
