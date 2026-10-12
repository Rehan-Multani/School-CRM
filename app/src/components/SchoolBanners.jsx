import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../lib/useAsync';
import { alpha, radius, spacing } from '../theme';
import { resolveAssetUri } from './Logos';
import { SkeletonBanner } from './Skeleton';

const SIDE = spacing.lg;
const ASPECT = 2 / 1;
const AUTO_ADVANCE_MS = 4500;

/**
 * The school's banners (uploaded by the School Admin), as a swipeable,
 * auto-advancing strip on the home screens of the student, parent and teacher
 * apps. Renders nothing when the school has no active banner.
 */
export default function SchoolBanners() {
  const { school, session } = useAuth();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const schoolId = school?.id;
  const role = session?.role || '';

  const state = useAsync(
    async () => {
      if (!schoolId) return [];
      const res = await api.get(`/school-theme/${encodeURIComponent(schoolId)}/banners`, { role });
      return res?.data || [];
    },
    [schoolId, role],
    { refetchOnFocus: true, cacheKey: 'school.banners' }
  );

  const banners = (state.data || [])
    .map((banner) => ({ ...banner, uri: resolveAssetUri(banner.imageUrl) }))
    .filter((banner) => banner.uri);

  const itemWidth = width - SIDE * 2;
  const itemHeight = Math.round(itemWidth / ASPECT);
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const touching = useRef(false);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const timer = setInterval(() => {
      if (touching.current) return;
      const next = (Math.min(indexRef.current, banners.length - 1) + 1) % banners.length;
      listRef.current?.scrollToOffset({ offset: next * (itemWidth + spacing.sm), animated: true });
      indexRef.current = next;
      setIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [banners.length, itemWidth]);

  const onScrollEnd = useCallback(
    (event) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / (itemWidth + spacing.sm));
      indexRef.current = next;
      setIndex(next);
      touching.current = false;
    },
    [itemWidth]
  );

  const open = (link) => {
    if (link) Linking.openURL(link).catch(() => {});
  };

  // First load (nothing cached yet): hold the banner's place so the page does not jump.
  if (!banners.length && schoolId && state.loading && !state.data) return <SkeletonBanner />;
  if (!banners.length) return null;
  // The list can shrink (a banner was hidden): never point past the end.
  const activeIndex = Math.min(index, banners.length - 1);

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={banners}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + spacing.sm}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SIDE }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: itemWidth + spacing.sm, offset: (itemWidth + spacing.sm) * i, index: i })}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item.link)}
            disabled={!item.link}
            accessibilityRole={item.link ? 'link' : 'image'}
            accessibilityLabel={item.title || 'School banner'}
            style={[styles.card, { width: itemWidth, height: itemHeight, backgroundColor: theme.surfaceAlt }]}
          >
            <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {item.title ? (
              <View style={[styles.caption, { backgroundColor: alpha('#000000', 0.45) }]}>
                <Text style={styles.captionText} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((banner, i) => (
            <View
              key={banner.id}
              style={[
                styles.dot,
                { backgroundColor: i === activeIndex ? theme.primary : alpha(theme.textMuted, 0.35), width: i === activeIndex ? 16 : 6 },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, paddingVertical: 6 },
  captionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  dot: { height: 6, borderRadius: 3 },
});
