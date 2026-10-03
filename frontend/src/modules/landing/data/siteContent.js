import { useEffect, useState } from 'react';
import axios from 'axios';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './legal';
import { PRODUCT } from './content';

// Public, unauthenticated reads of platform-managed content:
//  - GET /platform/privacy-policy  -> legal copy the Super Admin edits
//  - GET /platform/app-config      -> mobile-app store / APK links
// Both fall back to bundled defaults if the API is unreachable.

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
const http = axios.create({ baseURL: API_BASE, timeout: 8000 });

// Cache the in-flight promise so multiple pages/components share one request.
let legalPromise = null;
let appConfigPromise = null;

export function fetchLegalDocuments() {
  if (!legalPromise) {
    legalPromise = http
      .get('/platform/privacy-policy')
      .then((res) => res.data?.data || null)
      .catch(() => null);
  }
  return legalPromise;
}

export function fetchAppConfig() {
  if (!appConfigPromise) {
    appConfigPromise = http
      .get('/platform/app-config')
      .then((res) => res.data?.data || null)
      .catch(() => null);
  }
  return appConfigPromise;
}

// The stored legal text carries its own "Effective date:" / "Last updated:"
// lines; the page renders those from metadata instead, so drop them here.
export function stripLegalMeta(text = '') {
  return String(text)
    .split('\n')
    .filter((line) => !/^\s*(effective date|last updated)\s*:/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const FALLBACK = {
  privacyPolicy: PRIVACY_POLICY,
  termsOfService: TERMS_OF_SERVICE,
};

export function useLegalDocuments() {
  const [state, setState] = useState({
    privacyPolicy: FALLBACK.privacyPolicy,
    termsOfService: FALLBACK.termsOfService,
    updatedAt: null,
    loading: true,
    fromApi: false,
  });

  useEffect(() => {
    let alive = true;
    fetchLegalDocuments().then((data) => {
      if (!alive) return;
      if (data && (data.privacyPolicy || data.termsOfService)) {
        setState({
          privacyPolicy: data.privacyPolicy || FALLBACK.privacyPolicy,
          termsOfService: data.termsOfService || FALLBACK.termsOfService,
          updatedAt: data.updatedAt || null,
          loading: false,
          fromApi: true,
        });
      } else {
        setState((prev) => ({ ...prev, loading: false, fromApi: false }));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function useAppConfig() {
  const [state, setState] = useState({
    playStoreUrl: '',
    appStoreUrl: '',
    apkUrl: '',
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    fetchAppConfig().then((data) => {
      if (!alive) return;
      setState({
        playStoreUrl: data?.playStoreUrl || '',
        appStoreUrl: data?.appStoreUrl || '',
        apkUrl: data?.apkUrl || '',
        loading: false,
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function usePlatformContact() {
  const [state, setState] = useState({
    salesEmail: PRODUCT.email,
    supportEmail: PRODUCT.supportEmail,
    privacyEmail: PRODUCT.privacyEmail,
    phone: PRODUCT.phone,
    address: PRODUCT.address,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    fetchAppConfig().then((data) => {
      if (!alive || !data) return;
      const contact = data.contact || {};
      setState({
        salesEmail: contact.salesEmail || data.salesEmail || PRODUCT.email,
        supportEmail: contact.supportEmail || data.supportEmail || PRODUCT.supportEmail,
        privacyEmail: contact.privacyEmail || data.privacyEmail || PRODUCT.privacyEmail,
        phone: contact.phone || data.phone || PRODUCT.phone,
        address: contact.address || data.address || PRODUCT.address,
        loading: false,
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

