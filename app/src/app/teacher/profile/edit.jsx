import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { showError, toast } from '../../../lib/notify';
import { useKeyboard } from '../../../lib/useKeyboard';
import { Button, Input } from '../../../components/ui';
import { ErrorView, Select } from '../../../components/kit';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';
import { SkeletonForm } from '../../../components/Skeleton';

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;
const BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => ({ value: b, label: b || 'Not set' }));
const MARITAL = ['', 'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'].map((m) => ({ value: m, label: m ? m[0] + m.slice(1).toLowerCase() : 'Not set' }));

export default function EditProfile() {
  const theme = useTheme();
  const { refreshSession } = useAuth();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const state = useAsync(() => teacherApi.profile(), []);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = state.data;
    if (!p || f) return;
    setF({
      firstName: p.firstName || '',
      middleName: p.middleName || '',
      lastName: p.lastName || '',
      phone: p.mobileNumber || p.phone || '',
      alternateMobile: p.alternateMobile || '',
      bloodGroup: p.bloodGroup || '',
      maritalStatus: p.maritalStatus || '',
      nationality: p.nationality || '',
      emergencyContactName: p.emergencyContactName || '',
      emergencyContactNumber: p.emergencyContactNumber || '',
      emergencyContactRelationship: p.emergencyContactRelationship || '',
      addressLine: p.address?.addressLine || '',
      city: p.address?.city || '',
      state: p.address?.state || '',
      pincode: p.address?.pincode || '',
    });
  }, [state.data, f]);

  if (state.loading && !state.data) return <SkeletonForm fields={8} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (!f) return <SkeletonForm fields={8} />;

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    const e = {};
    if (!f.firstName.trim()) e.firstName = 'First name is required';
    if (!PHONE_RE.test(f.phone.trim())) e.phone = 'Enter a valid mobile number';
    for (const k of ['alternateMobile', 'emergencyContactNumber']) {
      if (f[k].trim() && !PHONE_RE.test(f[k].trim())) e[k] = 'Enter a valid number';
    }
    if (f.pincode.trim() && !/^\d{4,10}$/.test(f.pincode.trim())) e.pincode = 'Digits only';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const { addressLine, city, state: st, pincode, ...rest } = f;
      const body = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v.trim()]));
      body.mobileNumber = body.phone;
      body.address = { addressLine: addressLine.trim(), city: city.trim(), state: st.trim(), pincode: pincode.trim() };
      await teacherApi.updateProfile(body);
      await refreshSession().catch(() => {});
      toast.success('Profile details updated');
      router.back();
    } catch (err) {
      showError(err, 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const SectionCard = ({ title, icon, color = theme.primary, children }) => (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBox, { backgroundColor: alpha(color, theme.isDark ? 0.22 : 0.12) }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Information Notice Banner */}
        <View style={[styles.banner, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.18 : 0.08), borderColor: alpha(theme.primary, 0.25) }]}>
          <View style={[styles.bannerIconBox, { backgroundColor: alpha(theme.primary, 0.15) }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.text }]}>Faculty Profile Details</Text>
            <Text style={[styles.bannerText, { color: theme.textMuted }]}>
              Update your personal, emergency and communication records. Official employee ID and department assignments remain admin-managed.
            </Text>
          </View>
        </View>

        <SectionCard title="Personal Information" icon="person-outline" color="#3B82F6">
          <Input label="First Name" value={f.firstName} onChangeText={set('firstName')} maxLength={60} error={errors.firstName} required placeholder="Enter first name" />
          <Input label="Middle Name" value={f.middleName} onChangeText={set('middleName')} maxLength={60} placeholder="Enter middle name" />
          <Input label="Last Name" value={f.lastName} onChangeText={set('lastName')} maxLength={60} placeholder="Enter last name" />
          <Select label="Blood Group" value={f.bloodGroup} options={BLOOD} onChange={set('bloodGroup')} />
          <Select label="Marital Status" value={f.maritalStatus} options={MARITAL} onChange={set('maritalStatus')} />
          <Input label="Nationality" value={f.nationality} onChangeText={set('nationality')} maxLength={60} placeholder="e.g. Indian" />
        </SectionCard>

        <SectionCard title="Contact Numbers" icon="call-outline" color="#10B981">
          <Input label="Primary Mobile Number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={15} error={errors.phone} required placeholder="e.g. 9876543210" />
          <Input label="Alternate Mobile Number" value={f.alternateMobile} onChangeText={set('alternateMobile')} keyboardType="phone-pad" maxLength={15} error={errors.alternateMobile} placeholder="e.g. 9876543210" />
        </SectionCard>

        <SectionCard title="Emergency Contact" icon="warning-outline" color="#F59E0B">
          <Input label="Contact Person Name" value={f.emergencyContactName} onChangeText={set('emergencyContactName')} maxLength={80} placeholder="Full name" />
          <Input label="Contact Phone Number" value={f.emergencyContactNumber} onChangeText={set('emergencyContactNumber')} keyboardType="phone-pad" maxLength={15} error={errors.emergencyContactNumber} placeholder="e.g. 9876543210" />
          <Input label="Relationship" value={f.emergencyContactRelationship} onChangeText={set('emergencyContactRelationship')} maxLength={40} placeholder="e.g. Spouse, Sibling, Parent" />
        </SectionCard>

        <SectionCard title="Residential Address" icon="location-outline" color="#8B5CF6">
          <Input label="Address Line" value={f.addressLine} onChangeText={set('addressLine')} maxLength={300} placeholder="Street, house or flat number" />
          <Input label="City" value={f.city} onChangeText={set('city')} maxLength={80} placeholder="Enter city" />
          <Input label="State / Province" value={f.state} onChangeText={set('state')} maxLength={80} placeholder="Enter state" />
          <Input label="Postal / ZIP Code" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={10} error={errors.pincode} placeholder="e.g. 400001" />
        </SectionCard>

        <Button
          title="Save Profile Details"
          icon="checkmark-outline"
          loading={saving}
          loadingTitle="Saving changes..."
          onPress={save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: font.sm,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: font.xs,
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: font.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
  },
});
