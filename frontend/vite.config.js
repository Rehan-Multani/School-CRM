import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function firebaseMessagingSw(env) {
  const source = `importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
const firebaseConfig = {
  apiKey: ${JSON.stringify(env.VITE_FIREBASE_API_KEY || '')},
  authDomain: ${JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || '')},
  projectId: ${JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || '')},
  storageBucket: ${JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || '')},
  messagingSenderId: ${JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')},
  appId: ${JSON.stringify(env.VITE_FIREBASE_APP_ID || '')}
};
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'School CRM';
    const body = payload.notification?.body || payload.data?.body || '';
    self.registration.showNotification(title, { body, icon: '/School_logo.png' });
  });
}
`
  return {
    name: 'firebase-messaging-sw',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/firebase-messaging-sw.js')) {
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Service-Worker-Allowed', '/')
          res.end(source)
          return
        }
        next()
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'firebase-messaging-sw.js', source })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  return {
    plugins: [react(), firebaseMessagingSw(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
