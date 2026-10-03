import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { usePortal } from '../../context/PortalScope';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { newIdempotencyKey } from '../../api/client';
import { isRazorpayAvailable, openRazorpayCheckout } from '../../lib/razorpay';
import { errorText } from '../../lib/format';
import { toast } from '../../lib/notify';
import { Button, Card, Input } from '../ui';
import { money } from '../student/status';
import { font, spacing } from '../../theme';

// Doc 03 §7.4 — the only place the app takes money.
//
//   Pay → POST pay-order (rupees, Idempotency-Key) → Razorpay checkout
//       → POST verify (advisory) → poll the invoice until the WEBHOOK has
//         marked it paid → receipt.
//
// "Paid" is only ever shown from the invoice itself: Razorpay's webhook is the
// final truth, the app's verify call is not.
const PAYABLE = new Set(['PENDING', 'PARTIALLY_PAID', 'OVERDUE']);
const POLL_MS = 3000;
const POLL_TRIES = 10; // ~30 s
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function PayNow({ invoice, onChanged }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { api, base } = usePortal();
  const { user, school } = useAuth();
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [stage, setStage] = useState(null); // 'order' | 'checkout' | 'confirming'
  const [notice, setNotice] = useState(null); // { tone, text } shown under the button
  const [disabled, setDisabled] = useState(false); // PAYMENTS_NOT_CONFIGURED
  // One key per Pay tap; reused if that same tap is retried after a network
  // error, so it can never create a second Razorpay order.
  const key = useRef(null);

  const balance = Number(invoice.balanceAmount) || 0;
  if (!PAYABLE.has(invoice.status) || balance <= 0) return null;

  if (disabled) {
    return (
      <Card style={[styles.note, { marginTop: spacing.lg }]}>
        <Ionicons name="business-outline" size={20} color={theme.textMuted} />
        <Text style={styles.noteText}>Online payment is not enabled by your school. Please pay at the school office.</Text>
      </Card>
    );
  }

  // Poll until the webhook has updated the invoice (balance drops / status changes).
  const confirm = async () => {
    for (let i = 0; i < POLL_TRIES; i += 1) {
      await wait(POLL_MS);
      try {
        const fresh = await api.invoice(invoice.id);
        if (fresh.status !== invoice.status || Number(fresh.balanceAmount) < balance) return fresh;
      } catch {
        // transient — keep polling
      }
    }
    return null;
  };

  const pay = async () => {
    setAmountError('');
    setNotice(null);
    let rupees;
    if (amount.trim()) {
      rupees = Number(amount);
      if (!Number.isFinite(rupees) || rupees < 1 || rupees > balance) {
        setAmountError(`Enter an amount between ₹1 and ${money(balance)}`);
        return;
      }
    }
    // Check the SDK first: never create an order the device cannot pay.
    if (!isRazorpayAvailable()) {
      setNotice({ tone: 'warning', text: 'Online payment works in the installed school app. It is not available in this preview (Expo Go) build.' });
      return;
    }

    setStage('order');
    try {
      key.current = key.current || newIdempotencyKey();
      const order = await api.payOrder(invoice.id, rupees, key.current);
      key.current = null;

      setStage('checkout');
      const result = await openRazorpayCheckout({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount, // paise, exactly as the server returned it
        currency: order.currency || 'INR',
        name: school?.name || 'School Fees',
        description: order.invoiceNumber || invoice.invoiceNumber,
        prefill: { contact: user?.phone || '', email: user?.email || '' },
        theme: { color: theme.primary },
      });

      setStage('confirming');
      await api.verifyPayment({
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      }).catch(() => {
        // advisory only — the webhook still settles the invoice
      });

      const fresh = await confirm();
      onChanged?.();
      if (fresh) {
        setAmount('');
        toast.success('Payment received. Thank you!');
        const latest = [...(fresh.payments || [])].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
        if (latest?.id) router.push(`${base}/fees/receipt/${latest.id}`);
      } else {
        setNotice({ tone: 'primary', text: 'Payment received — the bank is still confirming it. This invoice will update shortly; pull down to refresh.' });
      }
    } catch (e) {
      if (e.code === 'PAYMENTS_NOT_CONFIGURED') setDisabled(true);
      else if (e.code === 'PAYMENT_AMOUNT_INVALID') setAmountError(errorText(e));
      else if (e.code === 'INVOICE_ALREADY_PAID' || e.code === 'INVOICE_NOT_PAYABLE') onChanged?.();
      else if (e.code === 'PAYMENT_CANCELLED') setNotice({ tone: 'muted', text: e.message });
      else setNotice({ tone: 'danger', text: errorText(e) });
    } finally {
      setStage(null);
    }
  };

  const busyTitle = stage === 'order' ? 'Starting payment...' : stage === 'confirming' ? 'Confirming payment...' : 'Opening checkout...';
  const noticeColor = notice ? theme[notice.tone] || theme.textMuted : null;

  return (
    <Card style={{ marginTop: spacing.lg }}>
      <View style={styles.head}>
        <Text style={styles.label}>Amount due</Text>
        <Text style={styles.due}>{money(balance)}</Text>
      </View>
      <Input
        label="Pay part amount (optional)"
        value={amount}
        onChangeText={(v) => {
          setAmount(v.replace(/[^\d.]/g, '').slice(0, 9));
          setAmountError('');
        }}
        keyboardType="decimal-pad"
        placeholder={`Leave empty to pay ${money(balance)}`}
        error={amountError}
        editable={!stage}
      />
      <Button
        title={amount.trim() && Number(amount) > 0 ? `Pay ${money(Number(amount))}` : `Pay ${money(balance)}`}
        icon="card-outline"
        loading={Boolean(stage)}
        loadingTitle={busyTitle}
        onPress={pay}
      />
      {notice ? <Text style={[styles.msg, { color: noticeColor }]}>{notice.text}</Text> : null}
      <View style={styles.secure}>
        <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
        <Text style={styles.secureText}>Secure payment by Razorpay · UPI, cards, net banking</Text>
      </View>
    </Card>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    label: { fontSize: font.md, color: t.textMuted, fontWeight: '600' },
    due: { fontSize: font.xl, fontWeight: '800', color: t.text },
    msg: { fontSize: font.sm, marginTop: spacing.md, lineHeight: 18 },
    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md },
    secureText: { fontSize: font.xs, color: t.textMuted },
    note: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    noteText: { flex: 1, fontSize: font.sm, color: t.textMuted, lineHeight: 18 },
  });
