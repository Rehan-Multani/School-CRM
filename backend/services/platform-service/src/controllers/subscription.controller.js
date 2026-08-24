import { subscriptionService } from '../services/subscription.service.js';

export async function listPlans(req, res, next) {
  try {
    const data = await subscriptionService.listPlans();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createPlan(req, res, next) {
  try {
    const data = await subscriptionService.createPlan(req.body, req.user?.sub || null);

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePlan(req, res, next) {
  try {
    const data = await subscriptionService.updatePlan(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePlan(req, res, next) {
  try {
    const data = await subscriptionService.deletePlan(req.params.id);

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}
