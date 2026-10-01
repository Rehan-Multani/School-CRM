import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { fileUrl } from '../../../lib/links';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button } from '../../../components/ui';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';
import DeleteAccountButton from '../../../components/account/DeleteAccountButton';

function InfoRow({ icon, label, value, styles, theme, isLast }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.infoIconBox, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.2 : 0.08) }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function BentoTile({ icon, color, title, sub, to, styles, theme }) {
  return (
    <Pressable
      onPress={() => router.push(to)}
      style={({ pressed }) => [
        styles.bentoTile,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.bentoIconBox, { backgroundColor: alpha(color, theme.isDark ? 0.22 : 0.12) }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.bentoTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.bentoSub} numberOfLines={1}>{sub}</Text>
      <View style={styles.bentoArrow}>
        <Ionicons name="arrow-forward" size={13} color={theme.textMuted} />
      </View>
    </Pressable>
  );
}

function MenuItem({ icon, color, title, sub, to, styles, theme, isLast }) {
  const c = color || theme.primary;
  return (
    <Pressable
      onPress={() => router.push(to)}
      style={({ pressed }) => [
        styles.menuRow,
        isLast && { borderBottomWidth: 0 },
        pressed && { opacity: 0.75, backgroundColor: theme.surfaceAlt },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.menuIconBox, { backgroundColor: alpha(c, theme.isDark ? 0.22 : 0.12) }]}>
        <Ionicons name={icon} size={20} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

export default function TeacherProfile() {
  const { user, logout, refreshSession } = useAuth();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const rawName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const initials = (rawName || 'T')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'T';

  const photo = fileUrl(user?.profilePhoto || user?.photo);

  useEffect(() => {
    setImgError(false);
  }, [photo]);

  const changePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > 5 * 1024 * 1024) {
      showError({ message: 'Photo must be under 5 MB.' });
      return;
    }
    const fd = new FormData();
    fd.append('photo', { uri: a.uri, name: a.fileName || 'photo.jpg', type: a.mimeType || 'image/jpeg' });
    setUploading(true);
    try {
      await teacherApi.uploadPhoto(fd);
      await refreshSession();
      setImgError(false);
      toast.success('Profile photo updated');
    } catch (e) {
      showError(e, 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const [loggingOut, setLoggingOut] = useState(false);
  const doLogout = async () => {
    if (await confirm('Logout?', 'You will need to sign in again to access the portal.', { confirmText: 'Logout', destructive: true })) {
      setLoggingOut(true);
      try {
        await logout();
      } finally {
        setLoggingOut(false);
      }
    }
  };

  const ctSections = (user?.classTeacherSections || [])
    .map((s) => `${s.className}-${s.sectionName}`)
    .join(', ');

  const hasPhoto = Boolean(photo && !imgError);

  return (
    <RefreshableScroll contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
      {/* Elevated Hero Profile Card with Layered Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Banner with gradient accent & decorative glow */}
        <LinearGradient
          colors={[theme.primary, alpha(theme.primary, 0.78)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.bannerCircle1} />
          <View style={styles.bannerCircle2} />
        </LinearGradient>

        {/* Solid Circular Avatar with Error-Resilient Fallback */}
        <View style={styles.avatarWrapper}>
          <Pressable onPress={changePhoto} disabled={uploading} style={styles.avatarPress}>
            {/* Opaque base: Android draws the elevation shadow through a translucent fill. */}
            <View style={[styles.avatarCircle, { backgroundColor: theme.surface, borderColor: theme.surface }]}>
              {hasPhoto ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.28 : 0.12) }]}>
                  <Text style={[styles.avatarInitials, { color: theme.primary }]}>{initials}</Text>
                </View>
              )}
            </View>

            <View style={[styles.cameraBadge, { backgroundColor: theme.primary, borderColor: theme.surface }]}>
              <Ionicons name={uploading ? 'hourglass-outline' : 'camera'} size={14} color={theme.onPrimary} />
            </View>
          </Pressable>
        </View>

        {/* User Identity Info */}
        <Text style={styles.userName} numberOfLines={1}>
          {rawName || 'Educator'}
        </Text>

        {/* Role & Status Badges */}
        <View style={styles.badgeRow}>
          {user?.designation ? (
            <View style={[styles.pillBadge, { backgroundColor: alpha(theme.primary, 0.12) }]}>
              <Ionicons name="school" size={12} color={theme.primary} />
              <Text style={[styles.pillText, { color: theme.primary }]}>{user.designation}</Text>
            </View>
          ) : null}

          <View style={[styles.pillBadge, { backgroundColor: alpha('#10B981', 0.12) }]}>
            <View style={[styles.activeDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.pillText, { color: '#10B981' }]}>Active Faculty</Text>
          </View>
        </View>

        {/* 3-Column Micro-Stats Strip */}
        <View style={[styles.metricsStrip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>EMP ID</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {user?.employeeId || '—'}
            </Text>
          </View>

          <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>DEPARTMENT</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {user?.department || 'General'}
            </Text>
          </View>

          <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CLASS TCHR</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {ctSections || 'None'}
            </Text>
          </View>
        </View>

        {/* Quick Edit Action Button */}
        <Pressable
          onPress={() => router.push('/teacher/profile/edit')}
          style={({ pressed }) => [
            styles.quickEditBtn,
            { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
            pressed && { opacity: 0.75, backgroundColor: alpha(theme.primary, 0.1) },
          ]}
        >
          <Ionicons name="create-outline" size={14} color={theme.primary} />
          <Text style={[styles.quickEditText, { color: theme.primary }]}>Edit Profile Details</Text>
        </Pressable>
      </View>

      {/* Quick Actions Bento Grid (2x2) */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <Text style={styles.sectionSub}>Manage classes & faculty schedule</Text>
      </View>
      <View style={styles.bentoGrid}>
        <BentoTile
          icon="calendar-outline"
          color="#8B5CF6"
          title="My Timetable"
          sub="Weekly periods"
          to="/teacher/timetable"
          styles={styles}
          theme={theme}
        />
        <BentoTile
          icon="airplane-outline"
          color="#06B6D4"
          title="Leave Portal"
          sub="Apply & track status"
          to="/teacher/leaves"
          styles={styles}
          theme={theme}
        />
        <BentoTile
          icon="people-outline"
          color="#10B981"
          title="My Classes"
          sub="Roster & attendance"
          to="/teacher/(tabs)/classes"
          styles={styles}
          theme={theme}
        />
        <BentoTile
          icon="document-attach-outline"
          color="#3B82F6"
          title="My Documents"
          sub="Certificates & files"
          to="/teacher/profile/documents"
          styles={styles}
          theme={theme}
        />
      </View>

      {/* Professional & Contact Details Card */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Professional & Contact Details</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <InfoRow
          icon="id-card-outline"
          label="Employee ID"
          value={user?.employeeId}
          styles={styles}
          theme={theme}
        />
        <InfoRow
          icon="briefcase-outline"
          label="Department"
          value={user?.department}
          styles={styles}
          theme={theme}
        />
        {user?.designation ? (
          <InfoRow
            icon="school-outline"
            label="Designation"
            value={user?.designation}
            styles={styles}
            theme={theme}
          />
        ) : null}
        {ctSections ? (
          <InfoRow
            icon="people-outline"
            label="Class Teacher Assigned"
            value={ctSections}
            styles={styles}
            theme={theme}
          />
        ) : null}
        <InfoRow
          icon="mail-outline"
          label="Official Email"
          value={user?.email}
          styles={styles}
          theme={theme}
        />
        <InfoRow
          icon="call-outline"
          label="Mobile Number"
          value={user?.phone}
          styles={styles}
          theme={theme}
          isLast
        />

        <View style={[styles.infoFooterNote, { borderTopColor: theme.border }]}>
          <Ionicons name="lock-closed-outline" size={14} color={theme.textMuted} />
          <Text style={styles.infoFooterText}>
            Official department assignment, designations and payroll records are managed by the school administrator.
          </Text>
        </View>
      </View>

      {/* Settings & Preferences */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Account & Preferences</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 0 }]}>
        <MenuItem
          icon="create-outline"
          color="#3B82F6"
          title="Edit Profile & Details"
          sub="Personal details, blood group & contact"
          to="/teacher/profile/edit"
          styles={styles}
          theme={theme}
        />
        <MenuItem
          icon="notifications-outline"
          color="#EC4899"
          title="Notification Preferences"
          sub="Push alerts & reminder toggles"
          to="/teacher/profile/settings"
          styles={styles}
          theme={theme}
        />
        <MenuItem
          icon="key-outline"
          color="#6366F1"
          title="Security & Password"
          sub="Update password & manage session"
          to="/teacher/profile/change-password"
          styles={styles}
          theme={theme}
          isLast
        />
      </View>

      {/* Account / Session Management */}
      <View style={styles.accountSection}>
        <Button
          title="Sign Out"
          icon="log-out-outline"
          variant="secondary"
          onPress={doLogout}
          loading={loggingOut}
          loadingTitle="Signing out..."
          style={styles.signOutBtn}
          textStyle={styles.signOutText}
        />
        <DeleteAccountButton style={{ marginTop: spacing.xs }} />

        <View style={styles.versionFooter}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.versionText}>School CRM · Verified Educator Session</Text>
        </View>
      </View>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    heroCard: {
      borderRadius: 24,
      overflow: 'hidden',
      alignItems: 'center',
      borderWidth: 1,
      marginBottom: spacing.lg,
      paddingBottom: spacing.lg,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    heroBanner: {
      width: '100%',
      height: 90,
      position: 'relative',
      overflow: 'hidden',
    },
    bannerCircle1: {
      position: 'absolute',
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: 'rgba(255,255,255,0.12)',
      top: -35,
      right: -25,
    },
    bannerCircle2: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.08)',
      bottom: -25,
      left: 15,
    },
    avatarWrapper: {
      marginTop: -48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    avatarPress: {
      position: 'relative',
    },
    avatarCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 4,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarFallback: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 7,
    },
    userName: {
      fontSize: 22,
      fontWeight: '900',
      color: t.text,
      letterSpacing: -0.4,
      marginTop: spacing.xs,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 6,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    pillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    pillText: {
      fontSize: font.xs,
      fontWeight: '700',
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    metricsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: '92%',
      marginTop: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    metricItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: t.textMuted,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    metricValue: {
      fontSize: font.sm,
      fontWeight: '800',
      color: t.text,
    },
    metricDivider: {
      width: 1,
      height: 24,
    },
    quickEditBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.md,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    quickEditText: {
      fontSize: font.xs,
      fontWeight: '700',
    },
    sectionHeaderRow: {
      marginBottom: spacing.xs,
      marginTop: spacing.md,
      paddingHorizontal: 2,
    },
    sectionHeader: {
      fontSize: font.md,
      fontWeight: '800',
      color: t.text,
      letterSpacing: -0.2,
    },
    sectionSub: {
      fontSize: font.xs,
      color: t.textMuted,
      marginTop: 1,
    },
    bentoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    bentoTile: {
      width: '48.5%',
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.md,
      position: 'relative',
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    bentoIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    bentoTitle: {
      fontSize: font.sm,
      fontWeight: '800',
      color: t.text,
      marginBottom: 2,
    },
    bentoSub: {
      fontSize: 11,
      color: t.textMuted,
    },
    bentoArrow: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
    },
    card: {
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    infoIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoLabel: {
      fontSize: font.xs,
      fontWeight: '600',
      color: t.textMuted,
    },
    infoValue: {
      fontSize: font.md,
      fontWeight: '700',
      color: t.text,
      marginTop: 2,
    },
    infoFooterNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    infoFooterText: {
      flex: 1,
      fontSize: font.xs,
      color: t.textMuted,
      lineHeight: 16,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
      paddingHorizontal: spacing.xs,
    },
    menuIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuTitle: {
      fontSize: font.md,
      fontWeight: '700',
      color: t.text,
    },
    menuSub: {
      fontSize: font.xs,
      color: t.textMuted,
      marginTop: 2,
    },
    versionFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingTop: spacing.xs,
    },
    versionText: {
      fontSize: font.xs,
      color: t.textMuted,
      fontWeight: '600',
    },
    accountSection: {
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    signOutBtn: {
      height: 46,
      minHeight: 46,
      borderRadius: radius.md,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    signOutText: {
      fontSize: font.md,
      fontWeight: '600',
      color: t.text,
    },
  });
