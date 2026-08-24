import { authService } from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const result = await authService.me(req.user?.sub);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const result = await authService.updateProfile(req.user?.sub, req.body || {});
    res.json({ success: true, message: 'Profile updated', ...result });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.user?.sub, req.body || {});
    res.json({ success: true, message: 'Password updated', ...result });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body?.refreshToken);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
