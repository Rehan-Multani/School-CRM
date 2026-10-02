import { isImageDataUri, schoolLogoPath } from '../utils/brandAsset.utils.js';

// The mobile app sends `X-Brand-Assets: url`. For those requests the school
// logo leaves the JSON body (a base64 data URI of up to ~3 MB on every login,
// `me` and theme response) and becomes a link to GET /school-theme/:id/logo,
// which the device downloads once and caches. The web panels do not send the
// header and keep receiving the data URI unchanged.
//
// One chokepoint instead of a flag threaded through every role's auth service:
// every such payload has the same shape — `school: { id, branding }` (login /
// me / profile) or `{ schoolId, branding }` (public theme) — at the top level
// or under `data`.

function linkBranding(branding, schoolId) {
  if (!branding || typeof branding !== 'object' || !schoolId) return branding;
  return {
    ...branding,
    logo: isImageDataUri(branding.logo) ? schoolLogoPath(schoolId, branding.logo) : branding.logo,
    // The app never shows a favicon; don't ship its bytes either.
    favicon: isImageDataUri(branding.favicon) ? '' : branding.favicon,
  };
}

export function linkBrandAssets(body) {
  if (!body || typeof body !== 'object') return body;
  for (const holder of [body, body.data]) {
    if (!holder || typeof holder !== 'object') continue;
    if (holder.branding) holder.branding = linkBranding(holder.branding, holder.schoolId);
    if (holder.school?.branding) holder.school.branding = linkBranding(holder.school.branding, holder.school.id);
  }
  return body;
}

export function brandAssetLinks(req, res, next) {
  if (String(req.headers['x-brand-assets'] || '').toLowerCase() !== 'url') return next();
  const json = res.json.bind(res);
  res.json = (body) => json(linkBrandAssets(body));
  return next();
}
