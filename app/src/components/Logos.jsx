import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { api, API_URL, PLATFORM_URL } from '../api/client';
import { useTheme } from '../context/ThemeContext';

const BUNDLED_LOGO = require('../../assets/logo.png');

// Platform logo is Super Admin–managed (GET /platform/app-config → logoUrl,
// a data-URI). Module-cached so login + splash share one request.
let platformLogoPromise = null;
function fetchPlatformLogo() {
  if (!platformLogoPromise) {
    platformLogoPromise = api
      .get('/app-config')
      .then((res) => res?.data?.logoUrl || '')
      .catch(() => {
        platformLogoPromise = null; // retry next mount
        return '';
      });
  }
  return platformLogoPromise;
}

// School logo is normally a `/school-theme/:id/logo?v=…` link (the app asks
// for links — see BRAND_ASSETS in api/client), which the OS image cache keeps
// on disk. It may also be an absolute URL, a server-relative path or, from an
// older backend, a data-URI.
export function resolveAssetUri(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^(data:|https?:)/i.test(value)) return value;
  if (value.startsWith('/school-theme/')) return `${PLATFORM_URL}${value}`;
  if (value.startsWith('/')) return `${API_URL.replace(/\/api\/v1$/, '')}${value}`;
  return null;
}

// Pull-to-refresh on login: drop the cache and re-fetch (bump `reloadKey` on <PlatformLogo>).
export function reloadPlatformLogo() {
  platformLogoPromise = null;
  return fetchPlatformLogo();
}

export function PlatformLogo({ size = 96, style, reloadKey = 0 }) {
  const [remote, setRemote] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPlatformLogo().then((uri) => {
      if (!alive) return;
      setFailed(false);
      setRemote(uri);
    });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const source = remote && !failed ? { uri: remote } : BUNDLED_LOGO;
  return (
    <Image
      source={source}
      onError={() => setFailed(true)}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

// School's own logo (admin panel → branding). Falls back to the school's initials.
export function SchoolLogo({ school, size = 44 }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = resolveAssetUri(school?.branding?.logo);

  useEffect(() => setFailed(false), [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={[styles.box, { width: size, height: size, borderRadius: size / 4, backgroundColor: theme.white }]}
        resizeMode="contain"
      />
    );
  }
  const initials = (school?.name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 4, backgroundColor: theme.primarySoft }]}>
      <Text style={{ color: theme.primary, fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
