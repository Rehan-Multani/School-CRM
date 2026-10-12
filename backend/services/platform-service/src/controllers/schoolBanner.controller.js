import { schoolBannerService } from '../services/schoolBanner.service.js';
import { schoolId, performedBy } from '../utils/tenant.js';
import { sendSuccess } from '../../../shared/response.js';

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error);
  }
};

export const listBanners = wrap(async (req, res) => {
  sendSuccess(res, await schoolBannerService.list(schoolId(req)), 'Banners retrieved successfully');
});

export const createBanner = wrap(async (req, res) => {
  const data = await schoolBannerService.create(
    schoolId(req),
    {
      file: req.file,
      title: req.body?.title,
      link: req.body?.link,
      isActive: req.body?.isActive,
      audience: req.body?.audience,
    },
    performedBy(req)
  );
  sendSuccess(res, data, 'Banner added', 201);
});

export const updateBanner = wrap(async (req, res) => {
  sendSuccess(res, await schoolBannerService.update(schoolId(req), req.params.id, req.body), 'Banner updated');
});

export const reorderBanners = wrap(async (req, res) => {
  sendSuccess(res, await schoolBannerService.reorder(schoolId(req), req.body?.ids), 'Banner order saved');
});

export const deleteBanner = wrap(async (req, res) => {
  sendSuccess(res, await schoolBannerService.remove(schoolId(req), req.params.id), 'Banner deleted');
});

// Public, like the school theme: what the mobile apps show on their home screens.
export const publicBanners = wrap(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, data: await schoolBannerService.publicList(req.params.schoolId, req.query.role) });
});

export const publicBannerImage = wrap(async (req, res) => {
  const asset = await schoolBannerService.publicImage(req.params.schoolId, req.params.bannerId);
  res.set('Content-Type', asset.contentType);
  res.set('ETag', `"${asset.version}"`);
  res.set(
    'Cache-Control',
    req.query.v === asset.version ? 'public, max-age=31536000, immutable' : 'public, max-age=300'
  );
  res.send(asset.buffer);
});
