import { schoolService } from '../services/school.service.js';

export async function listSchools(req, res, next) {
  try {
    const result = await schoolService.listSchools({
      search: req.query?.search,
      status: req.query?.status,
      plan: req.query?.plan,
      page: req.query?.page,
      limit: req.query?.limit,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function createSchool(req, res, next) {
  try {
    const data = await schoolService.createSchool(req.body, req.user?.sub || null);

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: data.school,
      credentials: data.credentials,
      emailSent: data.emailSent,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSchool(req, res, next) {
  try {
    const data = await schoolService.updateSchool(req.params.id, req.body);

    res.json({
      success: true,
      message: 'School updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSchoolStatus(req, res, next) {
  try {
    const data = await schoolService.updateStatus(req.params.id, req.body?.status);

    res.json({
      success: true,
      message: 'School status updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSchool(req, res, next) {
  try {
    const data = await schoolService.deleteSchool(req.params.id);

    res.json({
      success: true,
      message: 'School deleted successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetSchoolLogin(req, res, next) {
  try {
    const credentials = await schoolService.resetLogin(req.params.id);
    res.json({
      success: true,
      message: credentials.emailSent
        ? 'School admin login reset and emailed'
        : 'School admin login reset',
      credentials,
      emailSent: credentials.emailSent,
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolBranding(req, res, next) {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.json({ success: true, data: null });
    }
    const { School } = await import('../models/School.js');
    const school = await School.findOne(
      { 'admin.email': email },
      { name: 1, logo: 1, 'settings.portalBranding': 1 }
    ).lean();
    if (!school) {
      return res.json({ success: true, data: null });
    }
    res.json({
      success: true,
      data: {
        schoolName: school.name,
        logo: school.settings?.portalBranding?.logo || school.logo || '',
        favicon: school.settings?.portalBranding?.favicon || '',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolThemePublic(req, res, next) {
  try {
    const data = await schoolService.getPublicTheme(req.params.schoolId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function schoolAdminLogin(req, res, next) {
  try {
    const result = await schoolService.loginSchoolAdmin(req.body || {});
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolAdminForgotPassword(req, res, next) {
  try {
    const result = await schoolService.requestPasswordReset(req.body || {});
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolAdminResetPassword(req, res, next) {
  try {
    const result = await schoolService.resetPasswordWithToken(req.body || {});
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalMe(req, res, next) {
  try {
    const result = await schoolService.getPortalSchool(req.user?.sub);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalPlans(req, res, next) {
  try {
    const { subscriptionService } = await import('../services/subscription.service.js');
    const [data, subscriptionResult] = await Promise.all([
      subscriptionService.listPlans(),
      schoolService.getPortalSubscription(req.user?.sub),
    ]);
    res.json({ success: true, data, subscription: subscriptionResult.subscription });
  } catch (error) {
    next(error);
  }
}

export async function schoolInitiateSubscriptionCheckout(req, res, next) {
  try {
    const result = await schoolService.initiateSubscriptionCheckout(req.user?.sub, req.body?.planId, req);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalSettings(req, res, next) {
  try {
    const data = await schoolService.getSettings(req.user?.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalUpdateTheme(req, res, next) {
  try {
    const result = await schoolService.updateTheme(req.user?.sub, req.body || {});
    res.json({
      success: true,
      message: 'Theme updated',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalUpdateBranding(req, res, next) {
  try {
    const result = await schoolService.updatePortalBranding(req.user?.sub, req.body || {});
    res.json({
      success: true,
      message: 'Branding updated',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalChangePassword(req, res, next) {
  try {
    const result = await schoolService.changePortalPassword(req.user?.sub, req.body || {});
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalUpdateEmail(req, res, next) {
  try {
    const data = await schoolService.updateEmailSettings(req.user?.sub, req.body || {});
    res.json({
      success: true,
      message: 'Email settings saved',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalConfig(req, res, next) {
  try {
    const data = await schoolService.getSchoolConfig(req.user?.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function schoolPortalUpdateConfig(req, res, next) {
  try {
    const result = await schoolService.updateSchoolConfig(req.user?.sub, req.body || {});
    res.json({
      success: true,
      message: 'School configuration updated',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
