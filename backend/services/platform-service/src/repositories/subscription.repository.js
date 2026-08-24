import { SubscriptionPlan } from '../models/SubscriptionPlan.js';

export class SubscriptionRepository {
  list() {
    return SubscriptionPlan.find().sort({ createdAt: -1 });
  }

  create(payload) {
    return SubscriptionPlan.create(payload);
  }

  findByName(name) {
    return SubscriptionPlan.findOne({ name });
  }

  findById(id) {
    return SubscriptionPlan.findById(id);
  }

  updateById(id, payload) {
    return SubscriptionPlan.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  deleteById(id) {
    return SubscriptionPlan.findByIdAndDelete(id);
  }
}

export const subscriptionRepository = new SubscriptionRepository();
