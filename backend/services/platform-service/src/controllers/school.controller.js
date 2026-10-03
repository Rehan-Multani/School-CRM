import { schoolService } from '../services/school.service.js';
import { auditLogService } from '../services/auditLog.service.js';

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
      message: data.emailSent
        ? 'School created — login credentials emailed to the school admin'
        : 'School created, but the credentials email could not be sent. Use "Reset login" to try again once email is configured.',
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

export async function getSchoolFeatures(req, res, next) {
  try {
    const data = await schoolService.getFeatures(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateSchoolFeatures(req, res, next) {
  try {
    const result = await schoolService.updateFeatures(req.params.id, req.body || {});
    auditLogService.record(
      {
        user: {
          sub: req.params.id,
          userId: req.user?.sub || req.user?.userId || '',
          role: 'SUPERADMIN',
          name: req.user?.name || req.user?.email || 'Super Admin',
        },
        headers: req.headers,
        socket: req.socket,
      },
      {
        module: 'SAFE_PICKUP',
        action: 'SCHOOL_FEATURE_UPDATED',
        entityType: 'School',
        entityId: req.params.id,
        summary: `Safe pickup ${result.safePickupEnabled ? 'enabled' : 'disabled'} for the school`,
      }
    );
    res.json({ success: true, message: 'School features updated', data: result });
  } catch (error) {
    next(error);
  }
}

export async function changeSchoolAdminPassword(req, res, next) {
  try {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }
    const credentials = await schoolService.changeSchoolAdminPassword(req.params.id, password);
    res.json({
      success: true,
      message: credentials.emailSent
        ? 'School admin password updated and emailed'
        : 'Password updated, but the email could not be sent. Configure SMTP and reset the login to deliver it.',
      credentials,
      emailSent: credentials.emailSent,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetSchoolLogin(req, res, next) {
  try {
    const password = req.body?.password;
    const credentials = await schoolService.resetLogin(req.params.id, password);
    res.json({
      success: true,
      message: credentials.emailSent
        ? 'School admin login reset and emailed'
        : 'Login reset, but the email could not be sent. Configure SMTP and reset again to deliver the new password.',
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

// Public like the theme itself. `?v=` is the logo's content hash, so a matching
// request can be cached for good — a new logo gets a new URL.
export async function schoolLogoPublic(req, res, next) {
  try {
    const asset = await schoolService.getPublicLogo(req.params.schoolId);
    res.set('Content-Type', asset.contentType);
    res.set('ETag', `"${asset.version}"`);
    res.set('Cache-Control', req.query.v === asset.version ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
    res.send(asset.buffer);
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

export async function superAdminLoginAsSchool(req, res, next) {
  try {
    const data = await schoolService.createLoginAsCode(
      req.params.id,
      { id: req.user?.sub || '', name: req.user?.name || req.user?.email || 'Super Admin' },
      { ip: req.ip || '', userAgent: req.headers['user-agent'] || '' }
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function schoolAdminLoginAs(req, res, next) {
  try {
    const result = await schoolService.loginWithLoginAsCode(req.body || {});
    res.json({ success: true, ...result });
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
