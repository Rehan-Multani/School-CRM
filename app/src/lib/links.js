import { Linking } from 'react-native';
import { API_URL } from '../api/client';
import { showError } from './notify';

// Server origin (API_URL minus the /api/v1 suffix) — uploaded files are served
// from `<origin>/uploads/...`.
const ORIGIN = API_URL.replace(/\/api\/v\d+$/, '');

/** Absolute URL for a stored file path, or '' when it isn't a safe link. */
export function fileUrl(path) {
  const p = String(path || '').trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/uploads/') && !p.includes('..')) return `${ORIGIN}${p}`;
  return '';
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
