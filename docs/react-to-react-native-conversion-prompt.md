# Convert this React web app's mobile view into a React Native (Expo) app

## The job

This repository contains a React JS web app. Build a second, separate UI for the same product: a React Native app (Expo) in a new folder that reproduces the web app's **mobile view** screen for screen. Someone holding the finished app next to the website opened in a phone browser should see the same screens: same layout, spacing, colours, typography, icons, wording, states and behaviour.

The web app stays exactly as it is. You are adding a sibling, not migrating.

Two rules outrank everything else in this prompt.

**Rule 1: existing code is read-only.** Create and edit files only inside `TARGET_DIR`. Everything else in the repository is read-only: the web app, the backend, any existing mobile app, root config files, lockfiles, CI files and the root `.gitignore`. The owner relies on the web app continuing to build and behave exactly as it does today, so:

- Copy code into `TARGET_DIR` when you need it. Never import across the boundary (`../frontend/...`), never symlink, never add `TARGET_DIR` to a root workspace or monorepo config.
- Run installs, linters, formatters and codemods only with `TARGET_DIR` as the working directory.
- You may start the web app's dev server to look at it, but only if its dependencies are already installed. Never install or update dependencies there.
- Do not commit, push or create branches unless the user asks.
- Before your first write, run `git status --porcelain` and save the output in the ledger as the pre-existing dirty list. At the end of every work session run it again: every new or changed path must be under `TARGET_DIR`. If one is not, revert that change and say so in your report.

**Rule 2: the mobile web view is the visual specification.** The architecture section below tells you how to organise the code. It never tells you what a screen looks like. Every visual decision (colour, size, spacing, radius, font, icon, copy, order of elements, how a dialog opens) comes from what the web app renders at `VIEWPORT` width. Where the architecture's defaults and the web's look disagree, the web's look wins.

## Parameters

Edit these before running. Anything left on `auto` you detect yourself.

```
SOURCE_DIR    = auto     # folder of the React web app (its package.json and src/)
TARGET_DIR    = mobile   # new folder for the React Native app, at the repo root
REFERENCE_DIR = none     # optional path to the Expo app this architecture was taken from
SCOPE         = all      # all, or a comma-separated list of web route prefixes (/student,/teacher)
VIEWPORT      = 390      # CSS px width that defines "mobile view"
```

- If `SOURCE_DIR` is `auto` and the repository holds more than one React web app, list them and ask which one before writing anything.
- If `TARGET_DIR` already exists and has no `CONVERSION.md` inside, stop and ask. It is someone else's folder.
- If `REFERENCE_DIR` is set, treat it as read-only too. Read its `package.json`, `app.json`, `src/app/_layout.jsx`, one section's `_layout.jsx` and `(tabs)/_layout.jsx`, `src/theme/`, `src/context/`, `src/api/client.js`, `src/lib/`, `src/components/ui.jsx`, `src/components/kit.jsx`, `PagedList.jsx`, and two screens (one list, one form) before you start. Copy its infrastructure files (API client, `useAsync`, cache, notify, keyboard, network and foreground helpers, `PagedList`, `RefreshableScroll`, toast and confirm containers, skeletons, error and offline views, crash screen, splash) and adapt names, endpoints and storage keys. Do not copy its screens, its colours or its domain code: those come from the web app.

## How to run a job this large

This conversion is bigger than one context window. Plan for that from the start.

- Keep a ledger at `TARGET_DIR/CONVERSION.md`. It holds the discovery findings, a table of every web route (`web route | web file | RN file | status | notes`), a table of shared components (`web component | RN component | status`), and a list of deviations and open questions. Update it as each item is finished, not in batches.
- When you start or resume (new session, or after your context was compacted), read this prompt and the ledger first, then continue with the next unfinished row. Do not redo finished rows.
- Work through the phases in order. Do not start converting screens before the foundation and the shared kit exist, because every screen depends on them and rework multiplies.
- Keep going until every row in scope is `done` or `blocked` with a reason. Ask the user only for a decision that is theirs to make (which app, a missing credential, a product choice). For everything else choose the option that matches the web app most closely, record it in the ledger and continue.
- If you can delegate to parallel workers, do so only after Phases 1 and 2 are finished: one section per worker, each given the conversion rules, the fidelity contract and the ledger. Workers do not edit shared files (`theme/`, `components/ui`, `components/kit`, `api/client`, `lib/`); they report what they need added.

Phases: 0 Discover, 1 Foundation, 2 Shared kit, 3 Screens section by section, 4 Final audit.

## Phase 0: discover (read only)

Read before you write, and record what you find in the ledger.

1. **Stack.** Build tool, language (JS or TS), router and where the route table lives, styling system (Tailwind and its config including custom `screens`; CSS modules; styled-components; a component library; plain CSS), state management, HTTP client, form and validation libraries, i18n, icon set, chart library, fonts, where the session is stored, environment variables.
2. **How mobile is expressed.** Responsive utility prefixes, media queries, JS width checks (`window.innerWidth`, `matchMedia`, `useMediaQuery`, `isMobile`), and components that exist only for one size (bottom nav, off-canvas drawer, mobile top bar, desktop sidebar).
3. **Design tokens.** Every colour for light and dark, font family, sizes and weights, spacing rhythm, radii, shadows, gradients. Note any runtime theming (a tenant accent colour pushed into CSS variables, a dark-mode toggle).
4. **Route inventory.** Every route in `SCOPE`: path, page component, layout wrapper, auth or role guard, and which navigation chrome shows on mobile. Include dialogs, sheets and drawers that act as screens.
5. **Shared components.** Every reusable UI component, its props, and what it renders at `VIEWPORT`.
6. **API layer.** Base URL, auth header, response and error shape, interceptors (401 handling, token refresh), and every service function with its method, path and payload. If a page reads mock or static data, note the file.
7. **Web-only features.** File export, printing, web push, payments, maps, rich text, drag and drop, keyboard shortcuts, hover-only UI. Each needs a decision in Phase 3.

## Target architecture

This is the structure of the reference Expo app. Reproduce the structure, the file placement and the patterns. Fill them with the web app's content.

### Stack

- Expo (managed workflow, Continuous Native Generation: never create or hand-edit `ios/` or `android/`), Expo Router with file-based routes in `src/app/`, `"main": "expo-router/entry"`, React Compiler enabled in `app.json` (`experiments.reactCompiler`), portrait orientation.
- Same language as the web app. The reference is plain JavaScript (`.jsx`, `.js`); if the web app is TypeScript, keep `.tsx` and carry its types over.
- Styling is `StyleSheet` plus a theme object from React Context. No NativeWind, no CSS-in-JS library, no UI component library: the owner wants the same structure as the reference app, and hand-written styles are what make exact matching possible.
- State is React Context. Server data goes through the `useAsync` hook and `PagedList`. HTTP is a small `fetch` wrapper. If the web app has a substantial store (Redux, Zustand, and so on) whose logic the screens depend on, port that store unchanged, since these libraries run in React Native, and record the decision. The same goes for pure-JS logic libraries the web already uses (validation schemas, date maths, i18n): keeping them keeps behaviour identical. Replace only libraries that depend on the DOM.
- Baseline packages, as in the reference: `expo-router`, `expo-status-bar`, `expo-splash-screen`, `expo-secure-store`, `expo-font`, `expo-linear-gradient`, `expo-linking`, `expo-constants`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-web`, `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`, `@react-native-community/datetimepicker`. Add `expo-image-picker`, `expo-document-picker`, `expo-print`, `expo-sharing`, `expo-notifications` only when a web feature needs them.
- Use the current stable Expo SDK, or the SDK of `REFERENCE_DIR` when it is set (the reference runs Expo SDK 57, React Native 0.86, React 19.2). Expo changes APIs every release, so do not rely on memory: read the installed major version from `package.json`, then read the matching docs at `https://docs.expo.dev/versions/v<major>.0.0/` (index of all docs: `https://docs.expo.dev/llms.txt`) before using any Expo, EAS or React Native API. Install every package with `npx expo install <package>` so versions match the SDK.

### Folder layout

```
TARGET_DIR/
  app.json  app.config.js  eas.json  eslint.config.js  package.json  .gitignore  AGENTS.md
  .env                      EXPO_PUBLIC_API_URL=...
  CONVERSION.md             the ledger
  assets/                   icon, splash, images and fonts copied from the web app
  src/
    app/                    routes only; every file here is a screen or a navigator
      _layout.jsx           providers, root Stack, guards, global overlays
      index.jsx             <Redirect> to the signed-in home or to /login
      login.jsx             pre-auth screens sit at the root
      <section>/_layout.jsx one folder per top-level area of the web app
      <section>/(tabs)/_layout.jsx
      <section>/(tabs)/index.jsx
      <section>/<feature>/index.jsx   list
      <section>/<feature>/[id].jsx    detail
      <section>/<feature>/form.jsx    create, or edit with ?id=
    api/
      client.js             fetch wrapper (contract below)
      <section>.js          one module per backend area: every endpoint as a named method
    components/
      ui.jsx                primitives: Button, Input, Card, Loader
      kit.jsx               shared building blocks: Badge, Chip, Tabs, EmptyState, ErrorView,
                            AsyncView, PageHeader, Avatar, SearchBar, ListRow, StatCard,
                            ProgressBar, TextArea, Select, DateField, Modal/Sheet ...
      PagedList.jsx  RefreshableScroll.jsx  Skeleton.jsx  NetworkState.jsx  OfflineBanner.jsx
      Toast.jsx  ConfirmModal.jsx  CrashScreen.jsx  AnimatedSplash.jsx
      <section>/            pieces used by one section only
    context/
      AuthContext.jsx  ThemeContext.jsx  <Section>Context.jsx
    lib/
      useAsync.js  cache.js  notify.js  format.js  links.js  foreground.js
      useKeyboard.js  useNetwork.js  useUnsavedGuard.js
    theme/
      index.js              tokens + buildTheme()
```

A "section" is a top-level area of the web app with its own layout or guard: a role portal, an admin area, a public area. Keep route paths identical to the web paths (`/orders/:id` becomes `src/app/orders/[id].jsx`), so links, redirects and notification targets translate one to one. `index.jsx` redirects to whatever the web's default route is. Route files stay thin where two sections show the same screen: the second one re-exports the first (`export { default } from '../../student/homework/index';`) and the screen reads its API object and route prefix from a context instead of importing them.

Non-route code never lives in `src/app/`.

### Root layout

```jsx
// src/app/_layout.jsx
export { default as ErrorBoundary } from '../components/CrashScreen';
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { role } = useAuth(); // or a plain signed-in flag when there is one kind of user
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!role}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'ADMIN'}>
          <Stack.Screen name="admin" />
        </Stack.Protected>
        {/* one guarded entry per signed-in section, mirroring the web's route guards */}
      </Stack>
    </>
  );
}

function Boot() {
  const { booting } = useAuth();
  return (
    <AnimatedSplash ready={!booting}>
      <RootNavigator />
      <OfflineBanner />
      <ToastContainer />
      <ConfirmModalContainer />
    </AnimatedSplash>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <Boot />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

`AuthProvider` owns the session (`{ token, role, user, ... }`), restores it from `expo-secure-store` on launch, re-validates it with the same "current user" endpoint the web app calls, and exposes `booting`, `session`, `role`, `user`, `login`, `logout`. It registers a handler with the API client so a 401 on a live session drops the session and shows one toast. Storage is asynchronous in React Native: nothing that depends on stored values renders until `booting` is false, which is what the splash covers.

### Section layout and navigation chrome

Each section's `_layout.jsx` wraps its screens in that section's providers and a `Stack`, and lists every pushed screen with its title. Mirror the web's layout component:

- If the web layout keeps its mobile top bar and bottom nav on every page of the section (`TopBar + <Outlet/> + BottomNav`), render the same chrome in the section layout around the navigator, so it persists exactly as on the web.
- If the bottom nav shows only on some pages, put those pages in a `(tabs)` group with `Tabs` and a custom tab bar component (`tabBar={(props) => <BottomNav {...props} />}`), and push the other pages on the section's `Stack`.
- If the web opens an off-canvas drawer from a hamburger button, build it as a `Modal` plus `Animated` slide-in panel with the web's width, backdrop opacity and timing.

Build the top bar, bottom nav and drawer as custom components that reproduce the web's mobile versions (pass the top bar through the navigator's `header` option). Use the navigator's built-in header only where it is indistinguishable from the web's bar. A custom back button falls back to the section home when there is nothing to go back to (`router.canGoBack() ? router.back() : router.replace(home)`).

### Theme

```js
// src/theme/index.js. Values come from the web app's tokens found in Phase 0.
const light = { bg, surface, surfaceAlt, text, textMuted, border, danger, success, warning, white, shadow };
const dark  = { /* same keys */ };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius  = { sm: 8, md: 12, lg: 18, xl: 28, pill: 999 };
export const font    = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, xxl: 26, xxxl: 32 };

export function mix(a, b, amount) { /* blend two #RRGGBB colours */ }
export function alpha(hex, a) { /* #RRGGBB + 0..1 -> #RRGGBBAA */ }

export function buildTheme(primaryColor, mode = 'light') {
  const isDark = mode === 'dark';
  const base = isDark ? dark : light;
  const primary = isHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY;
  return {
    ...base, mode, isDark, primary,
    primaryDark: mix(primary, '#000000', 0.25),
    primarySoft: isDark ? mix(primary, base.bg, 0.78) : mix(primary, '#FFFFFF', 0.88),
    onPrimary: readableOn(primary), // black or white, whichever is legible
  };
}
```

```jsx
// src/context/ThemeContext.jsx
export function useTheme() { return useContext(ThemeContext); }
export function useStyles(factory) {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
```

The key names and the three scales above are the reference's. Keep the mechanism, replace the numbers with the web's, and add keys until every colour the web uses has a name (`info`, `inputBg`, `inputBorder`, chart colours and so on). Derived tints use `alpha()` and `mix()` instead of new hard-coded hex values. If the web supports dark mode, both palettes are complete and the chosen mode persists; if it does not, ship the light palette only. If the web recolours itself at runtime from a tenant or user setting, feed that colour into `buildTheme()` the same way.

Every component reads colours from the theme. Styles that depend on the theme go in a factory at the bottom of the file, `const makeStyles = (t) => StyleSheet.create({ ... })`, used as `const styles = useStyles(makeStyles)`. Styles that do not depend on it go in a module-level `StyleSheet.create`. Use named tokens for values the design repeats and plain numbers for one-offs.

### API layer

`src/api/client.js` contract:

- `API_URL` comes from `process.env.EXPO_PUBLIC_API_URL`. A release build never falls back to localhost.
- `setAuthToken(token)`, `getAuthToken()`, `setUnauthorizedHandler(fn)`.
- `request(path, { method, body, params, headers, signal })` and the shorthand `api.get/post/patch/put/delete`. It sends the same headers the web client sends and parses the same response shape.
- Failures throw `ApiError(message, status, code)`. A failure before any HTTP status is classified with NetInfo as `OFFLINE` or `NETWORK_ERROR`. Requests time out (20 s, uploads 120 s) with code `TIMEOUT`.
- Plain GETs are de-duplicated while in flight and retried twice with a short backoff on transient failures (network error, 502, 503, 504). Writes are sent exactly once and never retried automatically.
- `withSignal(signal, fn)` lets `useAsync` and `PagedList` cancel their GETs when a screen unmounts or its filters change.
- `upload(path, formData, { method, onProgress, headers })` uses `XMLHttpRequest`, because `fetch` reports no upload progress in React Native.
- `getLastWriteAt()` returns when the app last saved something, so screens refetch on focus only when their data may have changed.
- Anything the web client does in interceptors (token refresh, tenant headers, redirect on 401 or 402) is reproduced here.

One module per backend area, mirroring the web's service functions one to one: same method, path, query and payload.

```js
// src/api/orders.js
import { api } from './client';
const P = '/orders';
const data = (p) => p.then((r) => r.data);
const id = (v) => encodeURIComponent(String(v));

export const ordersApi = {
  list: (params) => api.get(P, params),            // lists resolve to the raw envelope (items + pagination)
  get: (orderId) => data(api.get(`${P}/${id(orderId)}`)),
  create: (body) => data(api.post(P, body)),
  update: (orderId, body) => data(api.patch(`${P}/${id(orderId)}`, body)),
};
```

Do not invent endpoints and do not change the backend. If a web page reads mock data, port the same mock file.

### Data loading

- `useAsync(fn, deps, { refetchOnFocus, cacheKey })` returns `{ data, error, loading, stale, cachedAt, reload, setData }`. Only the newest request may write state and older ones are aborted. `reload({ silent: true })` refreshes without flipping `loading`. With `cacheKey` the last result shows immediately (memory first, then AsyncStorage) while the fresh copy loads, and stays on screen with `stale: true` if the network fails. Never set `cacheKey` on data that seeds an edit form.
- `lib/cache.js` keeps that copy per signed-in account, caps entry size and count, expires entries after seven days and wipes everything on logout. It never stores credentials.
- `AsyncView` switches between loading, error, empty and content for a `useAsync` result.
- `PagedList` wraps `FlatList` for paged endpoints: `fetchPage(page)`, reload when `deps` change, pull to refresh, load more at the end.
- `RefreshableScroll` is a `ScrollView` with pull to refresh.

### Feedback

`lib/notify.js` is an event bus with no React dependency: `toast(message)`, `toast.success/error/info/warning(message, title)`, `showError(err)`, and `confirm(title, message, { confirmText, destructive })`, which returns a promise of true or false. `ToastContainer` and `ConfirmModalContainer` are mounted once in the root layout and subscribe to it, so any module can raise a toast or a confirmation. Style both to match the web's toast and confirm dialog. `lib/format.js` holds date and number formatters and `errorText(err)`, which maps error codes to friendly sentences so a raw `Request failed (502)` is never shown.

### Screen and form shape

```jsx
// src/app/admin/orders/index.jsx
export default function Orders() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [status, setStatus] = useState('all');
  const state = useAsync(() => ordersApi.list({ status }), [status], { refetchOnFocus: true, cacheKey: 'orders.list' });

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={styles.body}>
      <AsyncView state={state} empty={{ when: (d) => !d.data.length, view: <EmptyState title="No orders yet" /> }}>
        {(d) => d.data.map((o) => (
          <Pressable key={o.id} onPress={() => router.push(`/admin/orders/${o.id}`)} style={styles.card}>
            <Text style={styles.title} numberOfLines={1}>{o.title}</Text>
          </Pressable>
        ))}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    body: { padding: spacing.lg },
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
    title: { color: t.text, fontSize: font.lg, fontWeight: '700' },
  });
```

Forms keep one `form` object and one `errors` object in `useState`, with `const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))`. Validation runs on submit with the web's rules and the web's messages. A `saving` flag drives `<Button loading loadingTitle="Saving..." />`, and `Button` ignores further taps while an async `onPress` is running. The form sits in `KeyboardAvoidingView` + `ScrollView keyboardShouldPersistTaps="handled"`. Success is `toast(...)` followed by the same navigation the web performs; failure is `showError(err)` or a field error. `useUnsavedGuard(dirty)` asks before leaving with unsaved edits wherever the web does.

Other conventions: one default-exported function component per route file; a short comment at the top of a file or block when the reason is not obvious from the code; `accessibilityRole`, `accessibilityLabel` and `accessibilityState` on every touchable; touch targets of at least 44 px, using `hitSlop` so the visible size still matches the web.

## Conversion rules

### What counts as the mobile view

Resolve every responsive decision at `VIEWPORT` width and keep only the result.

- Tailwind: unprefixed utilities apply and so do `max-*:` variants; drop `sm:`, `md:`, `lg:`, `xl:`, `2xl:` variants (check the config first for custom `screens`). `md:hidden` content is visible on mobile and must be ported. `hidden md:block` content is not rendered on mobile and must not be ported.
- CSS, SCSS, CSS modules, styled-components: base rules plus every media query that matches the width (`max-width: 768px` applies, `min-width: 768px` does not).
- Component-library responsive props: take the smallest (`xs` or `base`) value.
- JS checks: evaluate with `window.innerWidth = VIEWPORT` and keep only that branch.
- Dark-mode variants (`dark:` or `.dark` selectors) become the dark palette's value for the same token.

Desktop-only UI (sidebar, command palette, keyboard shortcuts, hover tooltips, wide tables hidden on phones) is out of scope. List it in the ledger as not rendered on mobile.

### Elements

| Web | React Native |
| --- | --- |
| `div`, `section`, `main`, `header`, `nav`, `form`, `ul`, `li` | `View` |
| `p`, `span`, `h1`-`h6`, `label`, `strong`, `small` | `Text`; inline emphasis is a nested `Text` |
| `button`, clickable `div`, in-app `a` or `Link` | `Pressable` with an accessibility role |
| external `a` | `Pressable` + `Linking.openURL`, http and https only |
| `img` | `Image` with explicit width and height and a `resizeMode` matching `object-fit` |
| inline `svg` and `.svg` files | `react-native-svg` |
| text, email, password, number, tel `input` | `TextInput` with the matching `keyboardType`, `secureTextEntry`, `autoCapitalize`, `autoComplete` |
| `textarea` | `TextInput multiline textAlignVertical="top"` |
| native `select` | a field that opens a bottom-sheet list (`Modal` + `FlatList`) |
| custom dropdown, popover, menu | reproduce what the web shows on mobile, built with `Modal` and `Animated` |
| date and time `input` | a field styled like the web's that opens `@react-native-community/datetimepicker` |
| checkbox, radio, toggle | `Pressable`-built controls drawn to match the web |
| file `input` | `expo-document-picker` or `expo-image-picker`, then `FormData` with `{ uri, name, type }` |
| `table` | what the web shows at `VIEWPORT`: a horizontally scrolling grid (horizontal `ScrollView`, fixed column widths) or stacked cards |
| scrolling page or panel | `ScrollView`, or `FlatList` for long or paged lists |
| modal, dialog, drawer, bottom sheet | `Modal transparent` with `onRequestClose`, animated like the web's |
| toast, `alert`, `confirm` | `lib/notify` |

Every string sits inside a `Text`. Keep the web's copy character for character, including capitalisation and punctuation.

### Styles

Convert each web style to the React Native style that produces the same pixels.

- Units: `rem` and `em` become px at 16 px per rem; CSS px map one to one to React Native units. A Tailwind spacing step is 4 px. Resolve class names from the project's Tailwind version and config, not from memory.
- `View` is a flex column by default. Web `flex` (row) needs `flexDirection: 'row'`. `space-x-*`, `space-y-*` and `gap-*` become `gap`. `divide-y` becomes a border on every child except the last.
- CSS grid becomes `flexDirection: 'row', flexWrap: 'wrap'` with `gap` and item widths computed from the column count.
- Text styles do not inherit from a `View`. Push colour, size, weight, alignment and line height down onto each `Text`. Always set `lineHeight` when the web sets one. `truncate` becomes `numberOfLines={1}`, `line-clamp-n` becomes `numberOfLines={n}`. Letter spacing in `em` is multiplied by the font size.
- Load the web's font with `expo-font` and expose a helper that maps a weight to the right family name, because a custom font on Android needs one family per weight.
- Borders use the web's widths (`borderWidth: 1` for a 1 px border). Tailwind `ring` and CSS `outline` on focus become a border change in the focused state.
- Shadows go through one helper in the theme that returns the platform-correct style (iOS shadow props, Android `elevation`), defined once per shadow token the web uses.
- Gradients use `expo-linear-gradient` with the same stops and direction. Translucent backgrounds keep their alpha. Approximate `backdrop-blur` with the same translucent colour, and add a blur view only where the blur is plainly visible.
- `position: fixed` and `sticky` become an absolutely positioned view outside the scroll view or `stickyHeaderIndices`. `inset-0` is `StyleSheet.absoluteFill`. `vh` and `vw` come from `useWindowDimensions()`. `calc()` is computed in JS. `::before` and `::after` become real views.
- State variants: drop `hover:`. `active:` becomes the `pressed` style of `Pressable`, `focus:` becomes focus state on the input, `disabled:` becomes the disabled style. Where the web gives a touchable no pressed style, add light opacity feedback.
- Animations and transitions (CSS or framer-motion) use `Animated` with `useNativeDriver: true`, with the same duration, easing and distance for enters, exits and sheets. Drop transitions that only fire on hover.

### Icons, charts, media

- Use the React Native build of the icon set the web uses (`lucide-react` becomes `lucide-react-native`) with the same icon names, sizes and stroke widths. Fall back to `@expo/vector-icons` only for a set with no React Native build, choosing the closest glyph and listing the substitution in the ledger.
- Charts: build wrappers in `components/charts/` on `react-native-svg` with the same props as the web's chart wrappers, showing the same series, colours, axes, labels and legend at mobile width. Adopt a chart library only after confirming it supports the installed Expo SDK.
- Video, audio, maps, embedded pages and rich HTML need a native module or a web view. Check the Expo docs for the current recommended module and record the choice.

### Routing

| React Router | Expo Router |
| --- | --- |
| `<Route path>` table | files under `src/app/` |
| `<Outlet/>` in a layout | `<Stack/>`, `<Tabs/>` or `<Slot/>` in `_layout.jsx` |
| `useNavigate()` | `router.push`, `router.replace`, `router.back` |
| `<Link>`, `<NavLink>` | `Link`, or `Pressable` + `router.push`; active state from `usePathname()` |
| `<Navigate to>` | `<Redirect href>` |
| `useParams()` | `useLocalSearchParams()` |
| `useSearchParams()` | `useLocalSearchParams()` + `router.setParams()` |
| `useLocation()` | `usePathname()`, `useSegments()` |
| guard component or loader redirect | `Stack.Protected guard={...}` in the root layout |
| `document.title` | the screen's `title` option, or `navigation.setOptions` |

Presentation follows the web: a page stays a pushed screen, a dialog or bottom sheet stays a `Modal`. Do not turn the web's modal forms into separate screens or the reverse.

### Browser APIs

| Web | React Native |
| --- | --- |
| `localStorage` token or session | `expo-secure-store`, read once at boot |
| `localStorage` preferences and cached data | AsyncStorage |
| `import.meta.env.VITE_*`, `process.env.REACT_APP_*` | `process.env.EXPO_PUBLIC_*` (embedded in the bundle, so public values only) |
| `window.location`, `history` | `router` |
| `window.open`, external navigation | `Linking.openURL` |
| `resize` listener, `innerWidth` | `useWindowDimensions()` |
| `online` and `offline` events | NetInfo (`useOffline()`) |
| `visibilitychange`, window focus | `AppState`, `useFocusEffect` |
| `IntersectionObserver` for load-more | `FlatList onEndReached` |
| `window.print`, PDF download | `expo-print` to a PDF, then `expo-sharing` |
| CSV or spreadsheet export, blob download | write the file, then open the share sheet |
| clipboard | `expo-clipboard` |
| web push (service worker, Firebase web) | `expo-notifications`; if the backend cannot register native tokens, build the UI, leave registration unwired and record the gap |
| web payment widget, social login, captcha | the provider's native SDK or a web view; record the choice and never fake a result |

Service workers, PWA manifests and SEO tags have no counterpart. Note them and move on.

## Fidelity contract

Must match the web at `VIEWPORT`, for every screen and every state of it:

- which elements exist, their order and nesting, and their text;
- sizes, spacing, radii, borders, colours in light and dark, typography, icons;
- what each control does: navigation target, API call and payload, dialog opened, validation rule and message;
- conditional rendering: permissions, feature flags, empty, loading and error variants, badges and counts;
- formatting of dates, numbers and currency (compare actual output, since locale formatting can differ between engines).

Permitted differences, and only these:

1. Safe-area insets added to top and bottom chrome.
2. The operating system's own date, time and list pickers where the web uses the browser's native controls.
3. Keyboard avoidance, dismissing the keyboard on drag, and the Android back button closing modals.
4. Hover-only affordances removed; press feedback on touchables.
5. Pull to refresh on screens that load data.
6. Virtualised rendering of long lists, with the same items and the same paging model as the web (keep a pager if the web has a pager; load on scroll only if the web does).
7. States the web never designed (offline, request failed, session expired) use the kit's defaults, styled with the web's tokens.
8. Browser features with no native form (print dialog, file download) use the share sheet.

Everything else that differs is a defect. Do not redesign, rename, reorder, or substitute something "more native". If the web app has a bug or an inconsistency, reproduce the visible behaviour and note it in the ledger; do not fix it here.

## Phase 1: foundation

Create the Expo project in `TARGET_DIR` and build, in this order: `app.json` and `app.config.js` (name, slug, scheme and identifiers derived from the web project; list them in the final report for the owner to confirm), `.gitignore`, ESLint config, an `AGENTS.md` carrying the Expo rules from the Stack section, `theme/`, `ThemeContext`, `api/client.js`, `lib/`, `AuthContext`, the root layout, `index.jsx`, and the overlays (splash, crash screen, offline banner, toast, confirm). Then prove it: lint passes and the JS bundle builds.

## Phase 2: shared kit

Convert every shared web component before any page. Build each kit component from the web component that does the same job: take its prop names and variants from the web component, so call sites translate one to one, and take its file placement and theming mechanism from this prompt. Where pages repeat the same block of markup without a shared component, extract one. Finish the navigation chrome (top bar, bottom nav, drawer) and the form controls here too.

## Phase 3: screens

Order: auth screens, then the smallest section end to end as a pilot, then the rest. After the pilot, reread your output against this prompt and correct any drift in the kit before continuing, because every later screen inherits it.

For each screen:

1. Read the page component and everything it renders and calls: child components, hooks, constants, service functions. Read whole files, not excerpts.
2. Resolve the mobile view and strike out what is not rendered at `VIEWPORT`.
3. List the screen's states: loading, empty, error, populated, each dialog, sheet and menu, each validation error, each permission variant, dark mode.
4. Write the screen. Its JSX mirrors the web's tree from top to bottom, using kit components for shared pieces.
5. Port the logic as it is: same conditions, computed values, formatters, validation, API calls.
6. Check it against the list below, then update its ledger row.

A screen is done when:

- every element visible on the web at `VIEWPORT` is present, in the same order, with the same text;
- every control does what its web counterpart does;
- every state from step 3 exists;
- all colours come from the theme and both modes work, if the web has both;
- nothing web-only remains (see the audit search below);
- lint passes.

## Phase 4: final audit

1. Every route in scope is `done` or `blocked` with a reason, and the number of route files matches the inventory.
2. A search of `TARGET_DIR/src` for `className=`, `onClick=`, `<div`, `<span`, `window.`, `document.`, `localStorage`, `import.meta`, `react-router` and `react-dom` returns nothing.
3. From `TARGET_DIR`: `npx expo lint`, `npx expo-doctor`, and `npx expo export --platform android` all succeed.
4. Visual check. The project includes `react-native-web`, so `npx expo start --web` renders the app in a browser. If you have a browser tool, open the web app and the Expo web build side by side at `VIEWPORT` width, compare every screen and fix the differences. If you do not, walk each web component's JSX top to bottom and tick every element off against its screen.
5. `git status --porcelain` shows no path outside `TARGET_DIR` beyond the pre-existing dirty list.

## Final report

Tell the user, briefly: what was converted (sections and screen counts), anything `blocked` and why, every permitted difference you used beyond the standard list, every substitution (icons, charts, web-only features), backend gaps you found, the values that need the owner's confirmation (app name, bundle identifiers, API URL), how to run the app (`cd TARGET_DIR`, `npm install`, `npx expo start`), and confirmation that no file outside `TARGET_DIR` changed. State plainly what you verified by running it and what you verified only by reading, and note that a pass on a real Android and iOS device is still needed.
