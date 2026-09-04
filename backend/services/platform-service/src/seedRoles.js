import { School } from './models/School.js';
import { Role } from './models/Role.js';
import { SYSTEM_ROLE_DEFAULTS } from './config/permissions.js';

const SYSTEM_ROLES = [
  { name: 'School Admin', key: 'SCHOOLADMIN' },
  { name: 'Principal', key: 'PRINCIPAL' },
  { name: 'Accountant', key: 'ACCOUNTANT' },
  { name: 'HR Manager', key: 'HR' },
  { name: 'Librarian', key: 'LIBRARIAN' },
  { name: 'Transport Manager', key: 'TRANSPORT' },
];

const DEFAULT_BY_KEY = {
  SCHOOLADMIN: SYSTEM_ROLE_DEFAULTS.SchoolAdmin,
  PRINCIPAL: SYSTEM_ROLE_DEFAULTS.Principal,
  ACCOUNTANT: SYSTEM_ROLE_DEFAULTS.Accountant,
  HR: SYSTEM_ROLE_DEFAULTS.HR,
  LIBRARIAN: SYSTEM_ROLE_DEFAULTS.Librarian,
  TRANSPORT: SYSTEM_ROLE_DEFAULTS.Transport,
};

export async function seedRoles() {
  const schools = await School.find().select('_id').lean();
  let created = 0;
  for (const school of schools) {
    for (const def of SYSTEM_ROLES) {
      const exists = await Role.findOne({ schoolId: school._id, key: def.key }).lean();
      if (exists) continue;
      await Role.create({
        schoolId: school._id,
        name: def.name,
        key: def.key,
        description: `${def.name} (system role)`,
        isSystem: true,
        permissions: DEFAULT_BY_KEY[def.key] || [],
      });
      created += 1;
    }
  }
  if (created) {
    console.log(`[seedRoles] created ${created} system role(s)`);
  }
}
