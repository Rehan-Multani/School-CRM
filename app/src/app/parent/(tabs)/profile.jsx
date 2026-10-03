import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useParent } from '../../../context/ParentContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { parentApi } from '../../../api/parent';
import { fileUrl } from '../../../lib/links';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button } from '../../../components/ui';
import { Avatar, Badge, SectionTitle } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import DeleteAccountButton from '../../../components/account/DeleteAccountButton';
import { childClassLine } from '../../../components/parent/ChildSwitcher';
import { money } from '../../../components/student/status';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

// Bento quick tile for shortcuts
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

// Grouped settings row
function SettingsRow({ icon, color, title, sub, to, styles, theme, isLast }) {
  const c = color || theme.primary;
  return (
    <Pressable
      onPress={() => router.push(to)}
      style={({ pressed }) => [
        styles.settingsRow,
        isLast && { borderBottomWidth: 0 },
        pressed && { opacity: 0.75, backgroundColor: theme.surfaceAlt },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.settingsIconBox, { backgroundColor: alpha(c, theme.isDark ? 0.22 : 0.12) }]}>
        <Ionicons name={icon} size={20} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {sub ? <Text style={styles.settingsSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

export default function ParentProfile() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { user, logout, refreshSession } = useAuth();
  const { children, child, selectChild, reloadChildren } = useParent();
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const rawName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const initials = (rawName || 'P')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'P';

  const photo = fileUrl(user?.photo || user?.profilePhoto);
  const [prevPhoto, setPrevPhoto] = useState(photo);
  const [imgError, setImgError] = useState(false);
  if (prevPhoto !== photo) {
    setPrevPhoto(photo);
    setImgError(false);
  }

  const hasPhoto = Boolean(photo && !imgError);

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
      await parentApi.uploadPhoto(fd);
      await refreshSession();
      setImgError(false);
      toast.success('Profile photo updated');
    } catch (e) {
      showError(e, 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const doLogout = async () => {
    if (await confirm('Logout?', 'You will need to sign in again to access your account.', { confirmText: 'Logout', destructive: true })) {
      setLoggingOut(true);
      try {
        await logout();
      } finally {
        setLoggingOut(false);
      }
    }
  };

  const openChild = (c) => {
    selectChild(c.childId);
    router.push('/parent/child');
  };

  const childFirstName = String(child?.name || 'Child').split(' ')[0];

  return (
    <RefreshableScroll onRefresh={reloadChildren} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 150 }}>
      {/* Elevated Hero Profile Card with Layered Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Banner with gradient accent & decorative glow circles */}
        <LinearGradient
          colors={[theme.primary, alpha(theme.primary, 0.75)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.bannerCircle1} />
          <View style={styles.bannerCircle2} />
        </LinearGradient>

        {/* Solid Circular Avatar with Camera Badge */}
        <View style={styles.avatarWrapper}>
          <Pressable onPress={changePhoto} disabled={uploading} style={styles.avatarPress} accessibilityLabel="Change profile photo">
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
              {uploading ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Ionicons name="camera" size={14} color={theme.onPrimary} />
              )}
            </View>
          </Pressable>
        </View>

        {/* User Identity Info */}
        <Text style={styles.userName} numberOfLines={1}>
          {rawName || 'Parent'}
        </Text>

        {/* Role & Verification Badge Pills */}
        <View style={styles.badgeRow}>
          <View style={[styles.pillBadge, { backgroundColor: alpha(theme.primary, 0.12) }]}>
            <Ionicons name="people" size={12} color={theme.primary} />
            <Text style={[styles.pillText, { color: theme.primary }]}>Parent / Guardian</Text>
          </View>

          <View style={[styles.pillBadge, { backgroundColor: alpha('#10B981', 0.12) }]}>
            <View style={[styles.activeDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.pillText, { color: '#10B981' }]}>Verified Account</Text>
          </View>
        </View>

        {/* 3-Column Micro-Stats Strip */}
        <View style={[styles.metricsStrip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CHILDREN</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {children.length ? `${children.length} ${children.length === 1 ? 'Child' : 'Children'}` : '—'}
            </Text>
          </View>

          <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PHONE</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {user?.phone || '—'}
            </Text>
          </View>

          <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>EMAIL</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {user?.email ? user.email.split('@')[0] : '—'}
            </Text>
          </View>
        </View>

        {/* Quick Edit Action Button */}
        <Pressable
          onPress={() => router.push('/parent/profile/edit')}
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

      {/* Children Section */}
      <SectionTitle title={children.length > 1 ? 'My Children' : 'My Child'} />
      <View style={{ gap: spacing.sm }}>
        {children.map((c) => {
          const isSelected = c.childId === child?.childId;
          return (
            <Pressable
              key={c.childId}
              onPress={() => openChild(c)}
              style={({ pressed }) => [
                styles.childCard,
                {
                  backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                  borderColor: isSelected ? theme.primary : theme.border,
                  borderWidth: isSelected ? 1.5 : 1,
                },
                pressed && { opacity: 0.88, transform: [{ scale: 0.995 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${isSelected ? 'Active child' : 'Tap to switch child'}`}
            >
              <View style={styles.childHeader}>
                <Avatar source={fileUrl(c.photo)} name={c.name} size={46} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.childName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.childClass} numberOfLines={1}>
                    {childClassLine(c) || c.admissionNumber || 'Student'}
                  </Text>
                </View>
                {isSelected && children.length > 1 ? (
                  <View
                    style={[
                      styles.activePill,
                      {
                        backgroundColor: alpha(theme.primary, theme.isDark ? 0.22 : 0.12),
                        borderColor: alpha(theme.primary, 0.3),
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={13} color={theme.primary} />
                    <Text style={[styles.activePillText, { color: theme.primary }]}>Active</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.primary }}>View Profile</Text>
                    <Ionicons name="chevron-forward" size={13} color={theme.primary} />
                  </View>
                )}
              </View>

              <View style={[styles.childFooter, { borderTopColor: isSelected ? alpha(theme.primary, 0.15) : theme.border }]}>
                {c.attendancePercentage != null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons
                      name={c.attendancePercentage >= 75 ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                      size={14}
                      color={c.attendancePercentage >= 75 ? theme.success : theme.warning}
                    />
                    <Text style={styles.childFooterStat}>
                      <Text style={{ fontWeight: '800', color: c.attendancePercentage >= 75 ? theme.success : theme.warning }}>
                        {c.attendancePercentage}%
                      </Text>{' '}
                      Attendance
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
                    <Text style={[styles.childFooterStat, { color: theme.textMuted }]}>Attendance —</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons
                    name={c.pendingFees ? 'wallet-outline' : 'shield-checkmark-outline'}
                    size={14}
                    color={c.pendingFees ? theme.danger : theme.success}
                  />
                  <Text
                    style={[
                      styles.childFooterStat,
                      c.pendingFees
                        ? { color: theme.danger, fontWeight: '800' }
                        : { color: theme.success, fontWeight: '700' },
                    ]}
                  >
                    {c.pendingFees ? `${money(c.pendingFees)} due` : 'Fees clear'}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Selected Child Records Bento Grid */}
      <SectionTitle title={`${childFirstName}'s Records`} />
      <View style={styles.bentoRow}>
        <BentoTile
          icon="wallet-outline"
          color="#10B981"
          title="Fees & Dues"
          sub="Online fee payment"
          to="/parent/fees"
          styles={styles}
          theme={theme}
        />
        <BentoTile
          icon="receipt-outline"
          color="#8B5CF6"
          title="Receipts"
          sub="Fee bill receipts"
          to="/parent/fees/receipts"
          styles={styles}
          theme={theme}
        />
        <BentoTile
          icon="shield-checkmark-outline"
          color="#3B82F6"
          title="Safe Pickup"
          sub="OTP gate passes"
          to="/parent/pickup"
          styles={styles}
          theme={theme}
        />
      </View>

      {/* Account & Settings Group */}
      <SectionTitle title="Account & Settings" />
      <View style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <SettingsRow
          icon="person-outline"
          color={theme.primary}
          title="Personal Information"
          sub="Name, phone, email and address"
          to="/parent/profile/edit"
          styles={styles}
          theme={theme}
        />
        <SettingsRow
          icon="notifications-outline"
          color="#F59E0B"
          title="Notification Settings"
          sub="Alerts, announcements and push notifications"
          to="/parent/profile/settings"
          styles={styles}
          theme={theme}
        />
        <SettingsRow
          icon="key-outline"
          color="#EC4899"
          title="Security & Password"
          sub="Update account password"
          to="/parent/profile/change-password"
          styles={styles}
          theme={theme}
          isLast
        />
      </View>

      {/* Sign Out & Account Deletion */}
      <Button
        title="Sign Out"
        icon="log-out-outline"
        variant="secondary"
        loading={loggingOut}
        loadingTitle="Signing out..."
        onPress={doLogout}
        style={{ marginTop: spacing.xl }}
      />
      <DeleteAccountButton style={{ marginTop: spacing.md }} />

      {/* Version Tag */}
      <Text style={styles.versionTag}>School CRM · Parent Portal v1.0</Text>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    heroCard: {
      borderRadius: radius.xl,
      borderWidth: 1,
      overflow: 'hidden',
      alignItems: 'center',
      paddingBottom: spacing.lg,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      marginBottom: spacing.xs,
    },
    heroBanner: {
      width: '100%',
      height: 96,
      position: 'relative',
      overflow: 'hidden',
    },
    bannerCircle1: {
      position: 'absolute',
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      top: -40,
      right: -20,
    },
    bannerCircle2: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.07)',
      bottom: -20,
      left: 20,
    },
    avatarWrapper: {
      marginTop: -44,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    avatarPress: {
      position: 'relative',
    },
    avatarCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 4,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
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
      fontSize: 28,
      fontWeight: '800',
    },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    userName: {
      fontSize: 22,
      fontWeight: '800',
      color: t.text,
      marginTop: spacing.sm,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    pillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    pillText: {
      fontSize: font.xs,
      fontWeight: '700',
    },
    metricsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '92%',
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.xs,
    },
    metricItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: t.textMuted,
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    metricValue: {
      fontSize: font.xs,
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
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.pill,
      borderWidth: 1,
      marginTop: spacing.md,
    },
    quickEditText: {
      fontSize: font.xs,
      fontWeight: '700',
    },
    childCard: {
      borderRadius: radius.lg,
      padding: spacing.md,
      overflow: 'hidden',
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    childHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    childName: {
      fontSize: font.md,
      fontWeight: '800',
      color: t.text,
    },
    childClass: {
      fontSize: font.xs,
      color: t.textMuted,
      marginTop: 2,
      fontWeight: '600',
    },
    activePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    activePillText: {
      fontSize: font.xs,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    childFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    childFooterStat: {
      fontSize: font.xs,
      color: t.textMuted,
      fontWeight: '600',
    },
    bentoRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    bentoTile: {
      flex: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.md,
      position: 'relative',
      minHeight: 110,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    bentoIconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    bentoTitle: {
      fontSize: font.sm,
      fontWeight: '800',
      color: t.text,
      marginTop: 2,
    },
    bentoSub: {
      fontSize: 10,
      color: t.textMuted,
      fontWeight: '600',
      marginTop: 2,
    },
    bentoArrow: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
    },
    settingsGroup: {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    settingsIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsTitle: {
      fontSize: font.md,
      fontWeight: '700',
      color: t.text,
    },
    settingsSub: {
      fontSize: font.xs,
      color: t.textMuted,
      marginTop: 1,
    },
    versionTag: {
      textAlign: 'center',
      fontSize: font.xs,
      color: t.textMuted,
      marginTop: spacing.lg,
      opacity: 0.6,
    },
  });
