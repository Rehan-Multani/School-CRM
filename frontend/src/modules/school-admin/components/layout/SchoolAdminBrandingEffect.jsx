import { useEffect } from 'react';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';

const DEFAULT_FAVICON = '/School_logo.png';

function ensureIconLink(rel) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  return link;
}

function setFavicon(href) {
  const iconLink = ensureIconLink('icon');
  const appleLink = ensureIconLink('apple-touch-icon');
  iconLink.setAttribute('type', 'image/png');
  iconLink.setAttribute('href', href);
  appleLink.setAttribute('href', href);
}

export function SchoolAdminBrandingEffect() {
  const { user } = useSchoolAdminAuth();

  useEffect(() => {
    if (!user) {
      // Not logged in — keep / restore the static default
      setFavicon(DEFAULT_FAVICON);
      return;
    }

    // Prefer live user data; fall back to localStorage cache; then default
    const stored = JSON.parse(localStorage.getItem('school-admin-branding') || '{}');
    const favicon = user.brandingFavicon || stored.favicon || DEFAULT_FAVICON;
    setFavicon(favicon);

    return () => {
      // On unmount (logout / route-away) restore the static default
      setFavicon(DEFAULT_FAVICON);
    };
  }, [user?.brandingFavicon, user?.id]);

  return null;
}

export default SchoolAdminBrandingEffect;
