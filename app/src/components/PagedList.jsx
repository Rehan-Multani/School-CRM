import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';
import { ErrorView } from './kit';
import { SkeletonList } from './Skeleton';

// Infinite-scroll list over the standard list envelope
// `{ data: [], pagination: { page, totalPages } }`.
// `fetchPage(page)` must return that envelope. Re-fetches page 1 when `deps`
// change, on pull-to-refresh, and (silently) when the screen regains focus.
// Parent can call `ref.current.reload()` / `ref.current.update(fn)`.
const PagedList = forwardRef(function PagedList(
  { fetchPage, skeleton, deps = [], renderItem, keyExtractor = (x) => String(x.id), ListEmptyComponent, ListHeaderComponent, contentContainerStyle, refetchOnFocus = true, ...props },
  ref,
) {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const reqId = useRef(0);
  const focusedOnce = useRef(false);

  const loadFirst = useCallback(async (mode = 'initial') => {
    const my = ++reqId.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      const res = await fetchRef.current(1);
      if (my !== reqId.current) return;
      setItems(res?.data || []);
      setPage(1);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (e) {
      if (my === reqId.current) setError(e);
    } finally {
      if (my === reqId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    focusedOnce.current = false;
    loadFirst('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      loadFirst('silent');
    }, [refetchOnFocus, loadFirst]),
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || refreshing || page >= totalPages) return;
    const my = reqId.current;
    setLoadingMore(true);
    try {
      const res = await fetchRef.current(page + 1);
      if (my !== reqId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map(keyExtractor));
        return [...prev, ...(res?.data || []).filter((x) => !seen.has(keyExtractor(x)))];
      });
      setPage(page + 1);
      setTotalPages(res?.pagination?.totalPages || totalPages);
    } catch {
      // keep what we have; the user can pull to refresh
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, refreshing, page, totalPages, keyExtractor]);

  useImperativeHandle(ref, () => ({
    reload: () => loadFirst('silent'),
    update: (fn) => setItems((prev) => fn(prev)),
  }));

  // First load: the real header (filters/search stay usable) + a skeleton
  // shaped like the list, inside the same horizontal padding as the list.
  if (loading && !items.length) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingHorizontal: spacing.lg }} scrollEnabled={false}>
        {ListHeaderComponent}
        {skeleton || <SkeletonList padded={false} />}
      </ScrollView>
    );
  }
  if (error && !items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {ListHeaderComponent}
        <ErrorView error={error} onRetry={() => loadFirst('initial')} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={loadingMore ? <SkeletonList count={2} padded={false} /> : null}
      contentContainerStyle={[{ paddingHorizontal: spacing.lg, paddingBottom: 110, flexGrow: 1 }, contentContainerStyle]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadFirst('refresh')}
          colors={[theme.primary]}
          tintColor={theme.primary}
          progressBackgroundColor={theme.surface}
        />
      }
      {...props}
    />
  );
});

export default PagedList;
