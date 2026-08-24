import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function isFirebaseWebConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.messagingSenderId &&
      vapidKey
  );
}

let app;

function getFirebaseApp() {
  if (!isFirebaseWebConfigured()) {
    return null;
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export async function registerFcmToken() {
  if (!isFirebaseWebConfigured() || typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
  });
  const messaging = getMessaging(firebaseApp);
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
}

export async function listenForegroundMessages(onPayload) {
  if (!isFirebaseWebConfigured()) {
    return () => {};
  }

  const supported = await isSupported();
  if (!supported) {
    return () => {};
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return () => {};
  }

  const messaging = getMessaging(firebaseApp);
  return onMessage(messaging, (payload) => {
    onPayload(payload);
  });
}
