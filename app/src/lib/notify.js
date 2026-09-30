import { Alert } from 'react-native';
import { errorText } from './format';

const listeners = new Set();

/** Subscribe to live toast events from anywhere in the app */
export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Emit a toast to all active ToastContainer instances */
export function showToast(type = 'info', message = '', title = '', duration) {
  const normalizedType = ['success', 'error', 'warning', 'info'].includes(String(type).toLowerCase())
    ? String(type).toLowerCase()
    : 'info';

  const item = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    type: normalizedType,
    message: typeof message === 'string' ? message : (message?.message || String(message || '')),
    title: title || '',
    duration: typeof duration === 'number' ? duration : undefined,
  };

  listeners.forEach((listener) => {
    try {
      listener({ action: 'ADD', toast: item });
    } catch (e) {
      console.error('Toast listener error:', e);
    }
  });

  return item.id;
}

/** Dismiss an active toast by ID */
export function dismissToast(id) {
  listeners.forEach((listener) => {
    try {
      listener({ action: 'DISMISS', id });
    } catch (e) {
      console.error('Toast listener error:', e);
    }
  });
}

/**
 * Universal toast function.
 * If called as `toast('Profile updated')`, automatically selects appropriate type.
 * Also supports `toast(message, 'info' | 'success' | 'error' | 'warning', title)`.
 */
export function toast(message, type, title = '') {
  let resolvedType = type;
  if (!resolvedType) {
    const lower = String(message || '').toLowerCase();
    if (lower.startsWith('please') || lower.includes('enter') || lower.includes('select')) {
      resolvedType = 'info';
    } else {
      resolvedType = 'success';
    }
  }
  return showToast(resolvedType, message, title);
}

toast.success = (message, title = 'Success', duration) => showToast('success', message, title, duration);
toast.error = (message, title = 'Error', duration) => showToast('error', message, title, duration);
toast.info = (message, title = 'Info', duration) => showToast('info', message, title, duration);
toast.warning = (message, title = 'Warning', duration) => showToast('warning', message, title, duration);
toast.dismiss = (id) => dismissToast(id);

/** Show error as a top-right error toast */
export function showError(err, title = 'Error') {
  const msg = errorText(err);
  return toast.error(msg, title);
}

const confirmListeners = new Set();

export function subscribeConfirm(listener) {
  confirmListeners.add(listener);
  return () => {
    confirmListeners.delete(listener);
  };
}

/** Promise-based yes/no dialog. Uses in-app ConfirmModal if mounted, falls back to native Alert. */
export function confirm(title, message, options = {}) {
  return new Promise((resolve) => {
    if (confirmListeners.size > 0) {
      confirmListeners.forEach((listener) => {
        try {
          listener({ title, message, options, resolve });
        } catch (e) {
          console.error('Confirm listener error:', e);
        }
      });
      return;
    }
    const { confirmText = 'OK', destructive = false } = options;
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
