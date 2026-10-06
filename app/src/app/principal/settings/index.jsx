import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalApi } from '../../../api/principal';
import { fileUrl } from '../../../lib/links';
import { useKeyboard } from '../../../lib/useKeyboard';
import { useUnsavedGuard } from '../../../lib/useUnsavedGuard';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button, Card, Input } from '../../../components/ui';
import { Avatar, ListRow, SectionTitle } from '../../../components/kit';
import { font, spacing } from '../../../theme';

// Web: Settings & Parameters — profile (name, phone, photo), password. The web's Theme tab is
// skipped: the app's light/dark and accent colour come from the school's theme set by the admin.
const MAX_PHOTO = 2 * 1024 * 1024;

export default function PrincipalSettings() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { user, refreshSession } = useAuth();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const [firstName, setFirstName] = useState(user?.firstName || user?.name?.split(' ')?.[0] || '');
  const [lastName, setLastName] = useState(user?.lastName || user?.name?.split(' ')?.slice(1).join(' ') || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const dirty =
    firstName !== (user?.firstName || user?.name?.split(' ')?.[0] || '') ||
    lastName !== (user?.lastName || user?.name?.split(' ')?.slice(1).join(' ') || '') ||
    phone !== (user?.phone || '');
  useUnsavedGuard(dirty && !saving);

  const save = async () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (phone && !/^\d{10}$/.test(phone)) e.phone = 'Contact phone must be exactly 10 digits';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await principalApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone });
      await refreshSession().catch(() => {});
      toast.success('Profile updated');
    } catch (err) {
      showError(err, 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > MAX_PHOTO) {
      showError({ message: 'Please choose an image under 2 MB.' });
      return;
    }
    const fd = new FormData();
    fd.append('photo', { uri: a.uri, name: a.fileName || 'photo.jpg', type: a.mimeType || 'image/jpeg' });
    setPhotoBusy(true);
    try {
      await principalApi.uploadPhoto(fd);
      await refreshSession();
      toast.success('Profile photo updated');
    } catch (err) {
      showError(err, 'Upload failed');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!(await confirm('Remove photo?', 'Your profile photo will be deleted.', { confirmText: 'Remove', destructive: true }))) return;
    setPhotoBusy(true);
    try {
      await principalApi.updateProfile({ removePhoto: true });
      await refreshSession();
      toast.success('Profile photo removed');
    } catch (err) {
      showError(err, 'Could not remove photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const photo = fileUrl(user?.photo);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60) }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Card style={styles.hero}>
          <Avatar source={photo || undefined} name={user?.name} size={84} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.muted}>{user?.designation || 'School Principal'}</Text>
          <View style={styles.photoBtns}>
            <Button title={photo ? 'Change photo' : 'Upload photo'} variant="outline" icon="camera-outline" loading={photoBusy} loadingTitle="Please wait..." onPress={changePhoto} style={{ flex: 1 }} />
            {photo ? <Button title="Remove" variant="secondary" icon="trash-outline" disabled={photoBusy} onPress={removePhoto} style={{ flex: 1 }} /> : null}
          </View>
          <Text style={styles.hint}>PNG or JPG, max 2 MB.</Text>
        </Card>

        <SectionTitle title="Principal profile" />
        <Input label="First name" required value={firstName} onChangeText={setFirstName} error={errors.firstName} maxLength={60} />
        <Input label="Last name" value={lastName} onChangeText={setLastName} maxLength={60} />
        <Input label="Official email" value={user?.email || ''} editable={false} style={{ opacity: 0.7 }} />
        <Text style={[styles.hint, { marginTop: -spacing.md, marginBottom: spacing.lg }]}>Email is your login ID and cannot be changed here.</Text>
        <Input
          label="Contact phone"
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="9876543210"
          error={errors.phone}
        />
        <Button title="Save profile changes" loadingTitle="Saving..." loading={saving} disabled={!dirty} onPress={save} />

        <SectionTitle title="Security" />
        <Card style={{ paddingVertical: spacing.xs }}>
          <ListRow icon="lock-closed-outline" title="Change password" subtitle="Minimum 8 characters" onPress={() => router.push('/principal/profile/change-password')} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
    name: { color: t.text, fontSize: font.xl, fontWeight: '800', marginTop: spacing.sm },
    muted: { color: t.textMuted, fontSize: font.sm },
    hint: { color: t.textMuted, fontSize: font.xs },
    photoBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
  });
