import { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalPeopleApi } from '../../../api/principal/people';
import { fileUrl, openLink } from '../../../lib/links';
import { showError } from '../../../lib/notify';
import { Button, Card, Input } from '../../ui';
import { Avatar, Badge } from '../../kit';
import { font, radius, spacing } from '../../../theme';

// Building blocks shared by the principal Students / Teachers / Staff screens.

export const MAX_PHOTO = 2 * 1024 * 1024;
export const MAX_DOC = 5 * 1024 * 1024;

/** Digits only, max 10 (web sanitizeMobileInput). */
export const sanitizeMobile = (v) => String(v || '').replace(/\D/g, '').slice(0, 10);
export const isValidMobile = (v, required) => (v ? /^\d{10}$/.test(v) : !required);
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
export const dateOnly = (v) => (v ? String(v).slice(0, 10) : '');
export const personName = (p) => p?.name || p?.fullName || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '-';

export function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const STATUS_TONES = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  ON_LEAVE: 'warning',
  SUSPENDED: 'danger',
  RESIGNED: 'muted',
  TERMINATED: 'danger',
  PENDING_APPROVAL: 'warning',
  PENDING: 'warning',
  REJECTED: 'danger',
  WITHDRAWN: 'warning',
};
export function StatusPill({ status }) {
  if (!status) return null;
  return <Badge label={String(status).replace(/_/g, ' ')} tone={STATUS_TONES[status] || 'muted'} />;
}

/** Years / classes / sections for the pickers, with the web's year-to-class mapping. */
export function useAcademicRefs() {
  const [state, setState] = useState({ years: [], classes: [], sections: [], loading: true, error: null });
  const [yearClassMap, setYearClassMap] = useState({});

  useEffect(() => {
    let alive = true;
    Promise.all([principalPeopleApi.years(), principalPeopleApi.classes(), principalPeopleApi.sections()])
      .then(([y, c, s]) => {
        if (!alive) return;
        setState({
          years: y.data || [],
          classes: (c.data || []).filter((i) => i.status !== 'INACTIVE'),
          sections: s.data || [],
          loading: false,
          error: null,
        });
      })
      .catch((error) => alive && setState((p) => ({ ...p, loading: false, error })));
    return () => {
      alive = false;
    };
  }, []);

  const loadYearClasses = (yearId) => {
    if (!yearId || yearClassMap[yearId]) return;
    principalPeopleApi
      .yearClasses(yearId)
      .then((r) => {
        const ids = (r.data || []).filter((m) => m.class?.status !== 'INACTIVE').map((m) => m.classId);
        setYearClassMap((prev) => ({ ...prev, [yearId]: ids }));
      })
      .catch(() => {});
  };

  const classesForYear = (yearId, keepId) => {
    const allowed = yearClassMap[yearId];
    if (!yearId || !Array.isArray(allowed)) return state.classes;
    const set = new Set(allowed);
    return state.classes.filter((c) => set.has(c.id) || c.id === keepId);
  };

  const sectionsFor = (yearId, classId) =>
    state.sections.filter((s) => {
      if (yearId && s.academicYearId !== yearId) return false;
      if (classId && s.classId !== classId) return false;
      return s.status !== 'INACTIVE';
    });

  const currentYear = state.years.find((y) => y.isCurrent) || state.years.find((y) => y.status === 'ACTIVE');
  return { ...state, currentYear, loadYearClasses, classesForYear, sectionsFor };
}

/** Department / designation master data (non-blocking, like the web). */
export function useHrOptions() {
  const [opts, setOpts] = useState({ departments: [], designations: [] });
  useEffect(() => {
    let alive = true;
    Promise.all([principalPeopleApi.departments(), principalPeopleApi.designations()])
      .then(([d, g]) => alive && setOpts({ departments: d.data || [], designations: g.data || [] }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return opts;
}

// ------------------------------------------------------------------ display
export function SectionHead({ children }) {
  const theme = useTheme();
  return (
    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs, marginTop: spacing.lg }}>
      {children}
    </Text>
  );
}

export function Block({ title, children }) {
  return (
    <View>
      {title ? <SectionHead>{title}</SectionHead> : null}
      <Card>{children}</Card>
    </View>
  );
}

export function Info({ label, value, last }) {
  const theme = useTheme();
  return (
    <View style={[{ paddingVertical: spacing.sm }, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <Text style={{ fontSize: font.xs, fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: font.md, fontWeight: '600', color: theme.text, marginTop: 2 }} selectable>
        {value === 0 || value ? String(value) : '-'}
      </Text>
    </View>
  );
}

export function InfoList({ rows }) {
  return rows.map(([label, value], i) => <Info key={label} label={label} value={value} last={i === rows.length - 1} />);
}

export function CountStrip({ items }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
      {items.map((it) => (
        <View key={it.label} style={{ flex: 1, backgroundColor: theme.surface, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingVertical: spacing.sm, alignItems: 'center' }}>
          <Text style={{ fontSize: font.lg, fontWeight: '800', color: it.color || theme.text }}>{it.value ?? '-'}</Text>
          <Text style={{ fontSize: font.xs, color: theme.textMuted, fontWeight: '600' }} numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Profile header card used on all three detail screens. */
export function ProfileHeader({ photo, name, badges, lines }) {
  const theme = useTheme();
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Avatar source={fileUrl(photo) || undefined} name={name} size={72} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: font.xl, fontWeight: '800', color: theme.text }} numberOfLines={2}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{badges}</View>
        {lines.filter(Boolean).map((l) => (
          <Text key={l} style={{ fontSize: font.sm, color: theme.textMuted }} numberOfLines={2}>
            {l}
          </Text>
        ))}
      </View>
    </Card>
  );
}

/** Small tappable action (icon + text) used in list rows and detail action bars. */
export function ActionLink({ icon, label, onPress, tone = 'primary', disabled }) {
  const theme = useTheme();
  const colors = { danger: theme.danger, muted: theme.textMuted, success: theme.success, warning: theme.warning, primary: theme.primary };
  const color = colors[tone] || theme.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, opacity: disabled ? 0.5 : pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color, fontSize: font.sm, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** A list card: avatar, title, subtitle lines, status, optional action links. */
export function PersonCard({ photo, name, lines, status, extra, onPress, actions }) {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, opacity: pressed ? 0.7 : 1 })}>
        <Avatar source={fileUrl(photo) || undefined} name={name} size={46} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text }} numberOfLines={1}>
            {name}
          </Text>
          {lines.filter(Boolean).map((l, i) => (
            <Text key={i} style={{ fontSize: font.sm, color: theme.textMuted }} numberOfLines={1}>
              {l}
            </Text>
          ))}
          {extra}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {status}
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </View>
      </Pressable>
      {actions ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, paddingHorizontal: spacing.xs }}>{actions}</View>
      ) : null}
    </Card>
  );
}

// ------------------------------------------------------------------ pickers
export async function pickImages({ multiple = false, limit = 1, maxBytes, square = false } = {}) {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple && limit > 1,
    selectionLimit: multiple ? Math.max(1, limit) : 1,
    allowsEditing: !multiple && square,
    aspect: square ? [1, 1] : undefined,
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.length) return [];
  const out = [];
  for (const a of res.assets.slice(0, limit)) {
    if (maxBytes && a.fileSize && a.fileSize > maxBytes) {
      showError({ message: `Please upload an image under ${Math.round(maxBytes / 1024 / 1024)}MB` });
      continue;
    }
    out.push({ uri: a.uri, name: a.fileName || `image-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
  }
  return out;
}

/** Profile photo field. `picked` = newly chosen file, `existing` = stored path. */
export function PhotoField({ label = 'Profile Photo', existing, picked, removed, onPick, onRemove, maxBytes = MAX_PHOTO, hint }) {
  const theme = useTheme();
  const shown = picked?.uri || (!removed && existing ? fileUrl(existing) : '');
  const choose = async () => {
    const [f] = await pickImages({ square: true, maxBytes });
    if (f) onPick(f);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
      <Pressable
        onPress={choose}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ width: 88, height: 88, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: theme.surfaceAlt, borderWidth: 1.5, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
      >
        {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="camera-outline" size={30} color={theme.textMuted} />}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: font.md, fontWeight: '700', color: theme.text }}>{label}</Text>
        <Text style={{ fontSize: font.sm, color: theme.textMuted, marginBottom: 4 }}>{hint || `JPG, PNG or WebP, max ${Math.round(maxBytes / 1024 / 1024)}MB.`}</Text>
        <View style={{ flexDirection: 'row' }}>
          <ActionLink icon="image-outline" label={shown ? 'Replace' : 'Upload'} onPress={choose} />
          {shown ? <ActionLink icon="close-circle-outline" label="Remove" tone="danger" onPress={onRemove} /> : null}
        </View>
      </View>
    </View>
  );
}

/**
 * Document images group. `kept` = existing stored paths, `added` = picked files.
 * At most `max` images in total.
 */
export function DocGroup({ title, hint, kept, added, onRemoveKept, onRemoveAdded, onAdd, max = 2, maxBytes = MAX_DOC }) {
  const theme = useTheme();
  const total = kept.length + added.length;
  const thumbs = [
    ...kept.map((p) => ({ key: `k-${p}`, uri: fileUrl(p), remove: () => onRemoveKept(p) })),
    ...added.map((f, i) => ({ key: `a-${f.uri}`, uri: f.uri, remove: () => onRemoveAdded(i) })),
  ];
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ fontSize: font.md, fontWeight: '700', color: theme.text }}>{title}</Text>
      <Text style={{ fontSize: font.sm, color: theme.textMuted, marginBottom: spacing.sm }}>
        {hint ? `${hint} ` : ''}Up to {max} images, max {Math.round(maxBytes / 1024 / 1024)}MB each.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {thumbs.map((t) => (
          <View key={t.key} style={{ width: 96, height: 76, borderRadius: radius.md, overflow: 'hidden', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border }}>
            {t.uri ? <Image source={{ uri: t.uri }} style={{ width: '100%', height: '100%' }} /> : null}
            <Pressable onPress={t.remove} hitSlop={6} accessibilityLabel="Remove image" style={{ position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {total < max ? (
          <Pressable
            onPress={async () => {
              const files = await pickImages({ multiple: true, limit: max - total, maxBytes });
              if (files.length) onAdd(files);
            }}
            accessibilityRole="button"
            style={{ width: 96, height: 76, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border, alignItems: 'center', justifyContent: 'center', gap: 2 }}
          >
            <Ionicons name="image-outline" size={20} color={theme.textMuted} />
            <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.textMuted }}>Add image</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Read-only thumbnails of stored document paths; tap opens the file. */
export function DocView({ title, paths }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: font.md, fontWeight: '700', color: theme.text, marginBottom: spacing.sm }}>
        {title} ({paths.length})
      </Text>
      {paths.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {paths.map((p) => (
            <Pressable key={p} onPress={() => openLink(p)} style={{ width: 110, height: 86, borderRadius: radius.md, overflow: 'hidden', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border }}>
              <Image source={{ uri: fileUrl(p) }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: font.sm, color: theme.textMuted }}>Not uploaded</Text>
      )}
    </View>
  );
}

// ------------------------------------------------------------------ password sheet
/**
 * Bottom sheet to set a password. `onSubmit({ password, loginEmail })` resolves when saved.
 * `minLength`: 6 for staff users, 8 for student/teacher/parent logins (backend rules).
 */
export function PasswordSheet({ visible, onClose, ...rest }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  // The Modal renders nothing while hidden, so the body's form state starts fresh each time it opens.
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <PasswordSheetBody onClose={onClose} {...rest} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PasswordSheetBody({ title, subtitle, minLength = 8, askEmail, defaultEmail, submitLabel = 'Save Password', onClose, onSubmit }) {
  const styles = useStyles(makeStyles);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState(defaultEmail || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});

  const submit = async () => {
    const e = {};
    if (pw.length < minLength) e.pw = `Password must be at least ${minLength} characters`;
    else if (pw !== confirm) e.confirm = 'Passwords do not match';
    if (askEmail && email.trim() && !isEmail(email)) e.email = 'Enter a valid email address';
    setErr(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await onSubmit({ password: pw, loginEmail: email.trim().toLowerCase() });
      onClose();
    } catch (error) {
      showError(error, 'Could not save password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {askEmail ? (
        <Input label="Login email (optional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={err.email} placeholder="Defaults to the profile email" />
      ) : null}
      <Input label="New password" required secureTextEntry value={pw} onChangeText={setPw} autoCapitalize="none" error={err.pw} placeholder={`Minimum ${minLength} characters`} />
      <Input label="Confirm password" required secureTextEntry value={confirm} onChangeText={setConfirm} autoCapitalize="none" error={err.confirm} placeholder="Re-enter password" />
      <Button title={submitLabel} icon="key-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
      <Button title="Cancel" variant="ghost" onPress={onClose} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.lg, maxHeight: '90%' },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: spacing.md },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text },
    sub: { fontSize: font.sm, color: t.textMuted, marginTop: 2, marginBottom: spacing.lg },
  });

/** Memoised `[{ value, label }]` options. */
export function useOptions(items, valueKey, labelKey) {
  return useMemo(() => (items || []).map((i) => ({ value: i[valueKey], label: i[labelKey] })), [items, valueKey, labelKey]);
}
