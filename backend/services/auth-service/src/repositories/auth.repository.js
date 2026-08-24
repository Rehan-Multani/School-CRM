import { SuperAdminUser } from '../models/SuperAdminUser.js';

export class AuthRepository {
  findByEmail(email) {
    return SuperAdminUser.findOne({ email });
  }

  findById(id) {
    return SuperAdminUser.findById(id);
  }

  findByEmailWithPassword(email) {
    return SuperAdminUser.findOne({ email }).select('+passwordHash');
  }

  findByIdWithPassword(id) {
    return SuperAdminUser.findById(id).select('+passwordHash');
  }
}

export const authRepository = new AuthRepository();
