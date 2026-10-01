// Safe-pickup session status → badge + plain wording for a parent.
export const PICKUP_STATUS = {
  PENDING: { label: 'STARTED', tone: 'warning', text: 'The teacher has started a pickup. An OTP is being sent to your phone.' },
  OTP_SENT: { label: 'OTP SENT', tone: 'warning', text: 'An OTP was sent to your phone. Tell it to the teacher at the gate.' },
  VERIFIED: { label: 'VERIFIED', tone: 'primary', text: 'OTP verified. The teacher is handing over your child.' },
  COMPLETED: { label: 'COMPLETED', tone: 'success', text: 'Your child was handed over.' },
  EXPIRED: { label: 'EXPIRED', tone: 'muted', text: 'The OTP expired before it was used.' },
  CANCELLED: { label: 'CANCELLED', tone: 'muted', text: 'The teacher cancelled this pickup.' },
  FAILED: { label: 'FAILED', tone: 'danger', text: 'Too many wrong OTP attempts. The pickup was stopped.' },
};

export const pickupStatus = (s) => PICKUP_STATUS[s] || { label: String(s || ''), tone: 'muted', text: '' };
export const isActivePickup = (s) => s === 'PENDING' || s === 'OTP_SENT' || s === 'VERIFIED';
