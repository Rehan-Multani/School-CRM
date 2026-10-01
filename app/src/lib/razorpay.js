import { NativeModules, TurboModuleRegistry } from 'react-native';

// Native Razorpay checkout (react-native-razorpay). It is a native module, so
// it only exists in an installed build (dev build / release APK) — NOT in Expo
// Go. The package throws at import time when the native side is missing, so it
// is required lazily and only after checking the module is really there.

export class PaymentError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // 'RAZORPAY_UNAVAILABLE' | 'PAYMENT_CANCELLED' | 'PAYMENT_FAILED'
  }
}

export function isRazorpayAvailable() {
  try {
    return Boolean(TurboModuleRegistry.get?.('RNRazorpayCheckout') || NativeModules.RNRazorpayCheckout);
  } catch {
    return false;
  }
}

/**
 * Opens the checkout for a server-created order.
 * Resolves `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
 * Rejects PaymentError: cancelled by the user, failed, or SDK not in this build.
 */
export async function openRazorpayCheckout(options) {
  if (!isRazorpayAvailable()) {
    throw new PaymentError('Online payment needs the installed school app. It is not available in this preview build.', 'RAZORPAY_UNAVAILABLE');
  }
  let Checkout;
  try {
    Checkout = require('react-native-razorpay').default;
  } catch {
    throw new PaymentError('Online payment is not available in this build.', 'RAZORPAY_UNAVAILABLE');
  }
  try {
    return await Checkout.open(options);
  } catch (e) {
    // Razorpay: code 0 (Android) / 2 (iOS) = the user closed the sheet. Nothing was charged.
    const desc = String(e?.description || e?.error?.description || '');
    const cancelled = e?.code === 0 || e?.code === 2 || /cancel/i.test(desc);
    throw new PaymentError(
      cancelled ? 'Payment cancelled. Nothing was charged.' : 'Payment failed. Nothing was charged — please try again.',
      cancelled ? 'PAYMENT_CANCELLED' : 'PAYMENT_FAILED',
    );
  }
}
