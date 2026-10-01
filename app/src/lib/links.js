import { Linking } from 'react-native';
import { PLATFORM_URL, getAuthToken } from '../api/client';
import { showError } from './notify';

// Uploaded files are served by platform-service, which the gateway only exposes
// under /platform — `<gateway>/uploads/...` is a 404. The mount is JWT-gated
// (requireUploadAccess); <Image> and Linking cannot send an Authorization
// header, so the token rides in `?t=` exactly like the web panels' assetUrl().

/** Absolute URL for a stored file path, or '' when it isn't a safe link. */
export function fileUrl(path) {
  const p = String(path || '').trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith('/uploads/') || p.includes('..')) return '';
  const token = getAuthToken();
  return `${PLATFORM_URL}${p}${token ? `${p.includes('?') ? '&' : '?'}t=${encodeURIComponent(token)}` : ''}`;
}

// Only ever hand http(s) links to the OS — never `javascript:`, `intent:`,
// `file:` or other schemes that could come from user-entered data.
export async function openLink(path) {
  const url = fileUrl(path);
  if (!url) {
    showError({ message: 'This link cannot be opened.' });
    return;
  }
  try {
    await Linking.openURL(url);
  } catch (e) {
    showError(e, 'Could not open');
  }
}
