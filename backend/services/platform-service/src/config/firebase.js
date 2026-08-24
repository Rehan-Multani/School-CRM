import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from './env.js';

function loadServiceAccount() {
  const encoded = env.firebase.serviceAccountBase64;
  if (!encoded) {
    return null;
  }

  try {
    const raw = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    if (raw.project_id && raw.client_email && raw.private_key) {
      return {
        projectId: raw.project_id,
        clientEmail: raw.client_email,
        privateKey: raw.private_key,
      };
    }
  } catch (error) {
    console.error('Firebase service account Base64 is invalid:', error.message);
  }

  return null;
}

const serviceAccount = loadServiceAccount();

export function isFirebaseConfigured() {
  return Boolean(serviceAccount);
}

export function getFirebaseMessaging() {
  if (!serviceAccount) {
    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
    });
  }

  return getMessaging();
}
