import NetInfo from '@react-native-community/netinfo';
import { isOfflineState } from '../lib/useNetwork';
// Thin fetch wrapper around the gateway. Every APK flow shares the same
// envelope: success `{ success: true, data, pagination? }`,
// error `{ success: false, message, code }` + HTTP status.

// A release build must never fall back to a developer machine: without
// EXPO_PUBLIC_API_URL it talks to the production gateway. Only a dev build
// (Metro) may default to localhost.
const PRODUCTION_API_URL = 'https://schoolsarthiapp.com/api/v1';
const configuredUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
export const API_URL = (configuredUrl || (__DEV__ ? 'http://localhost:5000/api/v1' : PRODUCTION_API_URL)).replace(/\/+$/, '');
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

const cancelledError = () => new ApiError('Request cancelled', 0, 'CANCELLED');

// A screen that loads through useAsync / PagedList hands its AbortSignal to the
// GETs it starts (see `withSignal`), so leaving the screen or changing its
// filters stops the old download instead of letting it finish for nothing.
let ambientSignal = null;
export function withSignal(signal, fn) {
  const prev = ambientSignal;
  ambientSignal = signal;
  try {
    return fn();
  } finally {
    ambientSignal = prev;
  }
}

async function perform(url, { method = 'GET', body, headers, onResponse }, signal) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, isForm ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort);
  }
  let res;
  let json = null;
  try {
    try {
      res = await fetch(url, {
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
      if (timedOut) throw timeoutError();
      if (controller.signal.aborted) throw cancelledError();
      throw await networkError();
    }
    onResponse?.(res);
    // 304 answers a conditional GET (If-None-Match): unchanged, no body.
    if (res.status === 304) return { notModified: true };
    try {
      json = await res.json();
    } catch {
      // non-JSON body (e.g. gateway 502 HTML), or the body stalled past the timeout
      if (timedOut) throw timeoutError();
      if (controller.signal.aborted) throw cancelledError();
    }
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
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
  // A read that "succeeded" without the JSON envelope (captive portal, proxy
  // page) is a failure the screen can retry — not a crash on `undefined.data`.
  if (method === 'GET' && json === null) {
    throw new ApiError('The server sent an unexpected response. Please try again.', res.status, 'BAD_RESPONSE');
  }
  if (method !== 'GET') lastWriteAt = Date.now();
  return json;
}

// Reads are safe to repeat, so a blip (connection dropped, gateway restarting)
// is retried quietly with a growing pause. Writes are NEVER retried here: only
// the user's own tap may send a save / payment again.
const RETRY_DELAYS_MS = [600, 1800];
const isTransient = (err) => err?.code === 'NETWORK_ERROR' || [502, 503, 504].includes(err?.status);
const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

async function getWithRetry(url, signal) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await perform(url, { method: 'GET' }, signal);
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length || !isTransient(err) || signal.aborted) throw err;
      await sleep(RETRY_DELAYS_MS[attempt] + Math.random() * 250, signal);
      if (signal.aborted) throw cancelledError();
    }
  }
}

// Two parts of the app asking for the same thing at the same moment (a screen
// and its tab badge, a double focus event) share one request.
const inflight = new Map();

function sharedGet(url, signal) {
  const key = `${authToken || ''}|${url}`;
  let entry = inflight.get(key);
  if (!entry) {
    const controller = new AbortController();
    entry = { controller, waiting: 0, pinned: false, promise: null };
    const mine = entry;
    entry.promise = getWithRetry(url, controller.signal).finally(() => {
      if (inflight.get(key) === mine) inflight.delete(key);
    });
    // Every caller attaches its own handlers; this keeps a fully-cancelled
    // request from surfacing as an unhandled rejection.
    entry.promise.catch(() => {});
    inflight.set(key, entry);
  }
  const shared = entry;
  if (!signal) {
    shared.pinned = true; // someone who cannot cancel needs the answer
    return shared.promise;
  }
  if (signal.aborted) return Promise.reject(cancelledError());
  shared.waiting += 1;
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      shared.waiting -= 1;
      if (shared.waiting <= 0 && !shared.pinned) {
        shared.controller.abort();
        if (inflight.get(key) === shared) inflight.delete(key);
      }
      reject(cancelledError());
    };
    signal.addEventListener('abort', onAbort);
    const done = () => signal.removeEventListener('abort', onAbort);
    shared.promise.then(
      (v) => {
        done();
        resolve(v);
      },
      (e) => {
        done();
        reject(e);
      },
    );
  });
}

export function request(path, { method = 'GET', body, params, headers, onResponse, signal } = {}) {
  const url = `${PLATFORM_URL}${path}${buildQuery(params)}`;
  // Plain reads are shared + retried; conditional GETs (own headers) and every
  // write go straight through, exactly once.
  if (method === 'GET' && !headers && !onResponse) return sharedGet(url, signal || ambientSignal);
  return perform(url, { method, body, headers, onResponse }, signal);
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
