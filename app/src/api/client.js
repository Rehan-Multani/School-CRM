import NetInfo from '@react-native-community/netinfo';
import { isOfflineState } from '../lib/useNetwork';
// Thin fetch wrapper around the gateway. Every APK flow shares the same
// envelope: success `{ success: true, data, pagination? }`,
// error `{ success: false, message, code }` + HTTP status.

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
// Every platform-service route (school-portal, school-theme, app-config) is mounted under /platform.
export const PLATFORM_URL = `${API_URL}/platform`;

let authToken = null;
let onUnauthorized = null;
let onSubscriptionBlocked = null;

// Ask the backend for the school logo as a cacheable image link instead of a
// base64 data URI inside every login / `me` / theme response.
const BRAND_ASSETS = { 'X-Brand-Assets': 'url' };

// When the app last saved something. Screens that reload on focus use it to
// tell "data may have changed" from "just came back" (see lib/useAsync).
let lastWriteAt = 0;
export function getLastWriteAt() {
  return lastWriteAt;
}

export function setAuthToken(token) {
  authToken = token;
}

// For URLs that cannot carry an Authorization header (<Image>, Linking.openURL).
export function getAuthToken() {
  return authToken;
}

// AuthContext registers this so an expired/revoked token logs the user out.
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// 402 = school subscription expired. The session stays; the app shows a
// full-screen notice instead (see SubscriptionBlocked).
export function setSubscriptionBlockedHandler(fn) {
  onSubscriptionBlocked = fn;
}

// One key per user action (tap on Submit), reused on retry, so a double tap on
// a slow network cannot save twice. Only needs to be unique, not secret.
export function newIdempotencyKey() {
  const rnd = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rnd()}-${rnd()}-${rnd()}`;
}

// fetch failed before any HTTP status: tell "phone offline" (OFFLINE) apart
// from "online but server unreachable" (NETWORK_ERROR).
async function networkError() {
  try {
    if (isOfflineState(await NetInfo.fetch())) {
      return new ApiError('You are offline. Check your internet connection.', 0, 'OFFLINE');
    }
  } catch {
    // NetInfo unavailable — fall through
  }
  return new ApiError('Could not reach the school server. Please try again.', 0, 'NETWORK_ERROR');
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function buildQuery(params) {
  if (!params) return '';
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

// A stalled request (weak signal, server hung) must end in an error the user
// can retry instead of an endless spinner. Uploads get their own, longer limit.
const REQUEST_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 120000;
const timeoutError = () => new ApiError('The server is taking too long to respond. Please try again.', 0, 'TIMEOUT');

export async function request(path, { method = 'GET', body, params, headers, onResponse } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), isForm ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  let res;
  let json = null;
  try {
    try {
      res = await fetch(`${PLATFORM_URL}${path}${buildQuery(params)}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...BRAND_ASSETS,
          ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...headers,
        },
        body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw controller.signal.aborted ? timeoutError() : await networkError();
    }
    onResponse?.(res);
    // 304 answers a conditional GET (If-None-Match): unchanged, no body.
    if (res.status === 304) return { notModified: true };
    try {
      json = await res.json();
    } catch {
      // non-JSON body (e.g. gateway 502 HTML), or the body stalled past the timeout
    }
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok || json?.success === false) {
    if (res.status === 401 && authToken && onUnauthorized) onUnauthorized(json?.code);
    if (res.status === 402 && onSubscriptionBlocked) onSubscriptionBlocked(json?.message);
    const message =
      res.status === 429
        ? json?.message || 'Too many attempts. Please try again in a few minutes.'
        : json?.message || `Request failed (${res.status})`;
    const err = new ApiError(message, res.status, json?.code || (res.status === 429 ? 'RATE_LIMITED' : undefined));
    if (json?.suggestedRole) err.suggestedRole = json.suggestedRole;
    throw err;
  }
  if (method !== 'GET') lastWriteAt = Date.now();
  return json;
}

/**
 * GET with If-None-Match. Resolves `{ notModified: true }` on 304, otherwise
 * `{ json, etag }`. For polled endpoints (the school theme) so an unchanged
 * response costs headers only instead of the full body + logo.
 */
export async function conditionalGet(path, etag) {
  let responseEtag = null;
  const json = await request(path, {
    headers: etag ? { 'If-None-Match': etag } : undefined,
    onResponse: (res) => {
      responseEtag = res.headers.get('etag');
    },
  });
  if (json?.notModified) return json;
  return { json, etag: responseEtag };
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body, headers) => request(path, { method: 'POST', body, headers }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

// Multipart upload with progress (fetch has no upload progress in RN).
// Same envelope/error rules as `request`.
export function upload(path, formData, { method = 'POST', onProgress, headers } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${PLATFORM_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Brand-Assets', BRAND_ASSETS['X-Brand-Assets']);
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    for (const [k, v] of Object.entries(headers || {})) xhr.setRequestHeader(k, v);
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total) onProgress(e.loaded / e.total);
      };
    }
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.ontimeout = () => reject(timeoutError());
    xhr.onerror = () => networkError().then(reject);
    xhr.onload = () => {
      let json = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON body
      }
      const ok = xhr.status >= 200 && xhr.status < 300 && json?.success !== false;
      if (ok) {
        lastWriteAt = Date.now();
        return resolve(json);
      }
      if (xhr.status === 401 && authToken && onUnauthorized) onUnauthorized(json?.code);
      if (xhr.status === 402 && onSubscriptionBlocked) onSubscriptionBlocked(json?.message);
      reject(
        new ApiError(
          xhr.status === 429 ? json?.message || 'Too many attempts. Please try again in a few minutes.' : json?.message || `Upload failed (${xhr.status})`,
          xhr.status,
          json?.code || (xhr.status === 429 ? 'RATE_LIMITED' : undefined),
        ),
      );
    };
    xhr.send(formData);
  });
}
