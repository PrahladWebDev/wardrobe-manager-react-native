# UI Upgrade Guide

## Status (2026-09-15): implemented

Everything in Parts 1 and 2 and most of Part 3 is now in the codebase. Differences from the plan below:

- **Theme palette is untouched.** The ten themes keep their exact colors, including Cream Ink's accent pair. Only additive tokens were introduced: `typography.h4/caption/small`, `layout`, `hitSlop`, and `onAccent` on `themeList` entries.
- **No Reanimated, gesture-handler or `@gorhom/bottom-sheet`.** Press-scale, toast slide-in, skeleton pulse and the utilization ring all use the built-in `Animated` API. `FilterSheet` and `ActionSheet` are `Modal`-based bottom sheets. This keeps the dependency surface small; the four packages added are `expo-image`, `expo-haptics`, `expo-linear-gradient` and `@react-native-community/datetimepicker`.
- **Six tabs kept, now labeled** (Closet, Today, Outfits, Calendar, Stats, Profile) with filled icons on the active tab. The Fab quick-add sheet is live and hides whenever a screen is pushed over a tab root. Merging Stats into Calendar and the onboarding carousel are not done.
- **Wardrobe** keeps a single category chip row for one-tap access; dress code, season and status moved into the filter sheet.
- New shared pieces: `Screen`, `Skeleton`, `ErrorState`, `ActionSheet`, `FilterSheet`, `IconButton`, `Thumb`, `StatTile`, `WeatherPill`, `OutfitCollage`, `RingProgress`, `StickyFooter`, `Field`, `DateField`, `ToastContext`, `useFocusedFetch`, `useDebounce`, `utils/haptics`, `utils/color`, `utils/dates`, `constants/colors`.

The original plan follows for reference.

---

The token layer in `frontend/src/theme/themes.js` is good and every screen goes through `useTheme()`. The gap is one level up: there is no shared screen shell, no loading/empty/error trio, no feedback layer, and the same widgets (thumbnail rows, weather card, stat tile, section label) are re-implemented three or four times at different sizes. This guide fixes the visible defects first, then builds the missing layer in an order where each step makes the next one cheaper.

Everything here runs in Expo Go on SDK 57. No dev build needed.

```bash
cd frontend
npx expo install expo-image expo-haptics expo-linear-gradient react-native-reanimated react-native-worklets react-native-gesture-handler @react-native-community/datetimepicker
npm i @gorhom/bottom-sheet
```

`babel-preset-expo` already includes the Reanimated plugin, so no babel change is needed. Add `import 'react-native-gesture-handler';` as the first line of `App.js` and wrap the tree in `<GestureHandlerRootView style={{ flex: 1 }}>`.

---

## Part 1. Quick wins (about one day, no new components)

### 1.1 Favorite button invisible on dark themes

`ItemDetailScreen.js` line 323 hardcodes a white disc while the icon uses `theme.colors.text`, which is near-white on the five dark themes.

```js
favBtn: {
  backgroundColor: theme.colors.surface,
  borderWidth: theme.border.width,
  borderColor: theme.colors.text,
  width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
},
```

### 1.2 Charts clip on 360dp phones

`LineChart.js` line 11 (`width = 300`) and `BarChart.js` line 13 (`chartWidth = 220`) are fixed. Measure the container instead:

```jsx
// in StatsScreen.js, wrap each chart:
const [chartW, setChartW] = useState(0);
<View onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
  {chartW > 0 && <LineChart data={timeline} width={chartW} />}
</View>
```

and make both chart components take `width` as a prop with a sensible default.

### 1.3 Empty state flashes before the first fetch

`WardrobeScreen.js` line 121, `OutfitsScreen.js` line 115, `WishlistScreen.js` line 160 render "Your closet is empty" while the first request is in flight. `TodayScreen.js` renders three red "Nothing available" rows before data arrives.

```jsx
const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
// ...
ListEmptyComponent={status === 'ready' ? <EmptyState ... /> : null}
```

Part 2 replaces the `null` with a skeleton.

### 1.4 Touch targets and accessibility

- `Chip.js`: add `minHeight: 44` to the container and `accessibilityRole="button"`, `accessibilityState={{ selected: active }}`.
- Every icon-only `TouchableOpacity` (header icons in `AppNavigator.js` lines 52, 55, 94; the three `addBtn`s; fav, laundry, purchased toggle, stepper, photo remove): add `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` and an `accessibilityLabel`. Put the hitSlop object in `theme` as `theme.hitSlop` so it is not retyped.
- `OutfitsScreen.js` line 127 and `WishlistScreen.js` line 175: `addBtn` is 40px; make it 44 like Wardrobe.
- `textFaint` (`#8E8C82` on `#F7F1E4`) is about 3.2:1 contrast. Reserve it for 14px and up, or darken it to `#7A786E`.

### 1.5 Confirm destructive actions

`PollResultsScreen.js` line 87 (Close Poll) and `ProfileScreen.js` line 109 (Log Out) act immediately.

```js
const confirm = (title, message, onYes, yesLabel = 'Yes') =>
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: yesLabel, style: 'destructive', onPress: onYes }]);

// usage
onPress={() => confirm('Close this poll?', 'Nobody will be able to vote after this.', closePoll, 'Close poll')}
```

Wishlist delete is long-press only (`WishlistScreen.js` line 128). Add a visible trash icon on the row that opens the `ActionSheet` from the bug guide.

### 1.6 Remove doubled titles

Outfits, Wishlist, Repair Tracker and Surprise Me show the nav header title and an inline `h1` with the same text. Delete the inline heading on each (`OutfitsScreen.js` line 62, `WishlistScreen.js` line 91, `RepairTrackerScreen.js` line 91, `SurpriseOutfitScreen.js` line 115). Drop the emoji prefixes at the same time; Today, Stats and Calendar do not use them.

### 1.7 Fix the default theme's accent pair

`themes.js` line 186: `creamInk` has `accent: '#5B4FE0'` (violet) but `accentSoft: '#F3DCC0'` (peach). Active tab pills come out peach while chips come out violet. Make them a family:

```js
accent: '#5B4FE0',
accentSoft: '#E6E3FB',
```

### 1.8 Theme-blind literals

- `CalendarScreen.js` line 17: the middle heat bucket is `'#DE9E7E'` regardless of theme. Mix instead:

```js
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => {
  const [r1, g1, b1] = hexToRgb(a); const [r2, g2, b2] = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};
const getHeatColors = (theme) => ({ 1: theme.colors.accentSoft, 2: mix(theme.colors.accentSoft, theme.colors.accent, 0.5), 3: theme.colors.accent });
```

- `SettingsScreen.js` line 18: swatch border `'rgba(0,0,0,0.08)'` is invisible on dark; use `theme.colors.border`.
- `Button.js` lines 26, 31 and `ItemCard.js` lines 35, 40, 45: replace `'#fff'` with `theme.colors.onAccent`.
- `theme/colors.js` is a stale duplicate imported nowhere. Delete it.

### 1.9 Typography tokens the screens keep inventing

Add to every theme's `typography` in `themes.js`:

```js
h4: { fontSize: 15, fontWeight: '700', color: colors.text },
caption: { fontSize: 12, color: colors.textMuted },
small: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
```

Then replace the ad hoc `fontSize: 11/12` overrides in `ItemCard.js` line 89, `TodayScreen.js` lines 123 and 129, `PackingListScreen.js` line 165, `RepairTrackerScreen.js` line 134, `SettingsScreen.js` line 31, `AddItemScreen.js` line 178.

Also add layout tokens so the 130 / 110 / 60 bottom paddings that dodge the floating tab bar become one number:

```js
layout: { screenPadding: 20, tabBarHeight: 62, tabBarInset: 110 },
```

---

## Part 2. The missing component layer

Do these in order. Each one removes duplicated code from several screens.

### 2.1 `Screen` shell (one header language)

Wardrobe and Outfits use the native stack header in the system font. Today, Calendar, Stats and Profile hide it and draw a Playfair `h1` under the safe area. Adjacent tabs look like two apps.

**New file:** `src/components/Screen.js`

```jsx
import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function Screen({ title, subtitle, right, children, scroll = false, keyboard = false, refreshing, onRefresh, padded = true, tabInset = true, style }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const header = title ? (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
      <View style={{ flex: 1 }}>
        <Text style={theme.typography.h1}>{title}</Text>
        {subtitle ? <Text style={[theme.typography.bodyMuted, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View> : null}
    </View>
  ) : null;

  const contentStyle = {
    paddingTop: insets.top + 12,
    paddingHorizontal: padded ? theme.layout.screenPadding : 0,
    paddingBottom: tabInset ? theme.layout.tabBarInset : insets.bottom + 20,
  };

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} colors={[theme.colors.accent]} /> : undefined}
    >
      {header}{children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{header}{children}</View>
  );

  const root = <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>{body}</View>;
  return keyboard ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{root}</KeyboardAvoidingView>
  ) : root;
}
```

Then set `headerShown: false` on the Wardrobe and Outfits stack roots, move their header-right icons into `right`, and swap every tab root to `<Screen title="..." right={...}>`. Pushed screens (ItemDetail, OutfitDetail, forms) keep the native header for the back button.

Screens missing keyboard handling today, to fix with `<Screen scroll keyboard>`: ItemDetail (repair inputs at the bottom), Profile, PackingList, VotePoll, CreatePoll, CreateOutfit.

### 2.2 Loading, empty and error trio

**New file:** `src/components/Skeleton.js`

```jsx
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function Skeleton({ width = '100%', height = 16, radius, style }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: radius ?? theme.radius.sm, backgroundColor: theme.colors.surfaceAlt, opacity: pulse }, style]} />;
}

export function ItemCardSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ width: '47%', marginBottom: 16 }}>
      <Skeleton height={undefined} style={{ aspectRatio: 3 / 4 }} radius={theme.radius.md} />
      <Skeleton width="70%" height={14} style={{ marginTop: 10 }} />
      <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {Array.from({ length: count }).map((_, i) => <ItemCardSkeleton key={i} />)}
    </View>
  );
}

export function RowSkeleton({ lines = 2 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
      <Skeleton width={56} height={56} radius={14} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} width={i === 0 ? '60%' : '35%'} height={i === 0 ? 14 : 12} style={{ marginTop: i ? 6 : 0 }} />)}
      </View>
    </View>
  );
}
```

**New file:** `src/components/ErrorState.js`

```jsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
      <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textFaint} />
      <Text style={[theme.typography.h3, { marginTop: 12 }]}>Could not load</Text>
      <Text style={[theme.typography.bodyMuted, { textAlign: 'center', marginTop: 4 }]}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="outline" onPress={onRetry} style={{ marginTop: 16 }} /> : null}
    </View>
  );
}
```

Give `EmptyState` an optional `action={{ label, onPress }}` prop that renders a `Button`, so "Your closet is empty" can carry an "Add your first item" button.

**New file:** `src/hooks/useFocusedFetch.js`. This replaces the copy-pasted load boilerplate in about twelve screens and fixes the double-fetch and stale-response bugs in one place.

```js
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function useFocusedFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++reqId.current;
    if (!silent) setStatus((s) => (s === 'ready' ? 'ready' : 'loading'));
    try {
      const result = await fetcher();
      if (id !== reqId.current) return;
      setData(result); setError(null); setStatus('ready');
    } catch (err) {
      if (id !== reqId.current) return;
      setError(err.message); if (!silent) setStatus('error');
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { run({ silent: true }); }, [run]));

  const refresh = useCallback(async () => { setRefreshing(true); await run({ silent: true }); setRefreshing(false); }, [run]);

  return { data, status, error, refreshing, refresh, reload: run, setData };
}
```

Usage in a list screen:

```jsx
const { data, status, error, refreshing, refresh, reload } = useFocusedFetch(
  () => api.get('/outfits', { params }).then((r) => r.data.outfits),
  [params]
);
if (status === 'loading') return <Screen title="Outfits"><SkeletonGrid /></Screen>;
if (status === 'error') return <Screen title="Outfits"><ErrorState message={error} onRetry={reload} /></Screen>;
```

Detail screens that currently return a bare `<View>` while loading (`ItemDetailScreen.js` line 173, `OutfitDetailScreen.js` line 57, `PollResultsScreen.js` line 39) get a `DetailSkeleton` (image block plus three text lines) and an `ErrorState` on failure.

### 2.3 Toast and haptics

Success is currently a blocking `Alert` ("Saved", "Logged!", "Added!") and log-wear, laundry, favorite and repair-advance give no feedback at all.

**New file:** `src/context/ToastContext.js`

```jsx
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const ICONS = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' };

export function ToastProvider({ children }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const y = useRef(new Animated.Value(-120)).current;
  const timer = useRef(null);

  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 14 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(y, { toValue: -120, duration: 200, useNativeDriver: true }).start(() => setToast(null));
    }, 2200);
  }, [y]);

  const bg = toast?.type === 'error' ? theme.colors.danger : toast?.type === 'info' ? theme.colors.info : theme.colors.accent;
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: insets.top + 8, left: 16, right: 16, transform: [{ translateY: y }],
          backgroundColor: bg, borderRadius: theme.radius.md, borderWidth: theme.border.width, borderColor: theme.colors.text,
          padding: 14, flexDirection: 'row', alignItems: 'center', ...theme.shadow.card,
        }}>
          <Ionicons name={ICONS[toast.type]} size={20} color={theme.colors.onAccent} />
          <Text style={[theme.typography.body, { color: theme.colors.onAccent, marginLeft: 10, fontWeight: '600' }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
```

Mount `ToastProvider` inside `ThemeProvider` in `App.js`.

**New file:** `src/utils/haptics.js`

```js
import * as Haptics from 'expo-haptics';
const safe = (fn) => fn().catch(() => {});
export const haptic = {
  select: () => safe(() => Haptics.selectionAsync()),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
```

Where to wire it:

| Action | Feedback |
|---|---|
| Chip tap, tab press | `haptic.select()` |
| Log wear, favorite, laundry toggle | `haptic.light()` + toast "Logged a wear" / "Added to favorites" |
| Save item / outfit / profile | `haptic.success()` + toast, replace the `Alert.alert('Saved')` calls |
| Delete, close poll, log out | `haptic.warning()` before the confirm dialog |
| Any caught request error | toast with `type: 'error'` instead of `console.warn` |

### 2.4 Form system

`Input` has no error state, so all six forms validate through `Alert`. Extend `Input.js`:

```jsx
export default function Input({ label, error, helperText, leftIcon, rightSlot, style, ...props }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={[theme.typography.label, { marginBottom: 6 }]}>{label}</Text> : null}
      <View style={[{
        flexDirection: 'row', alignItems: 'center', minHeight: 48,
        borderWidth: theme.border.width, borderColor: error ? theme.colors.danger : theme.colors.text,
        borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, paddingHorizontal: 14,
      }, style]}>
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} /> : null}
        <TextInput style={[theme.typography.body, { flex: 1, paddingVertical: 10 }]} placeholderTextColor={theme.colors.textFaint} {...props} />
        {rightSlot}
      </View>
      {error || helperText ? (
        <Text style={[theme.typography.caption, { marginTop: 4, color: error ? theme.colors.danger : theme.colors.textMuted }]}>{error || helperText}</Text>
      ) : null}
    </View>
  );
}
```

Then:

- **Password toggle** on Login/Register: `rightSlot={<TouchableOpacity onPress={() => setShow(!show)} hitSlop={theme.hitSlop}><Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} .../></TouchableOpacity>}` with `secureTextEntry={!show}`.
- **Inline validation** on blur: email format, password length, item name required, at least one outfit item.
- **Native date pickers** in Packing List using `@react-native-community/datetimepicker` in place of the two free-text inputs.
- **`Field` helper** (`src/components/Field.js`): a section label plus children, replacing the three `sectionLabel` copies in AddItem, CreateOutfit and WishlistForm.
- **`StickyFooter`** (`src/components/StickyFooter.js`): safe-area-aware bottom bar holding the primary Save button, shared by AddItem, CreateOutfit, CreatePoll and WishlistForm, so the save button is never below the keyboard or the fold.

---

## Part 3. Screen-level upgrades

### 3.1 Wardrobe: filters in a bottom sheet, debounced search

The two stacked chip rows (`WardrobeScreen.js` lines 82 to 104) eat a third of the screen. Replace with one row: search pill plus a "Filters" button showing the active count, opening a `@gorhom/bottom-sheet` with Category, Dress code, Season, In laundry, Favorites and a Clear-all. The search debounce and stale-request guard are in the bug guide, fix 9.

**New file:** `src/components/FilterSheet.js` (sketch)

```jsx
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

export default function FilterSheet({ sheetRef, sections, onClear }) {
  const theme = useTheme();
  return (
    <BottomSheet ref={sheetRef} index={-1} snapPoints={['55%', '85%']} enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textFaint }}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}>
      <BottomSheetView style={{ padding: 20, paddingBottom: 40 }}>
        {sections.map((s) => (
          <View key={s.title} style={{ marginBottom: 18 }}>
            <Text style={[theme.typography.label, { marginBottom: 8 }]}>{s.title.toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {s.options.map((o) => <Chip key={o.key} label={o.label} active={s.value === o.key} onPress={() => { haptic.select(); s.onChange(o.key); }} />)}
            </View>
          </View>
        ))}
        <Button title="Clear all" variant="ghost" onPress={onClear} />
      </BottomSheetView>
    </BottomSheet>
  );
}
```

Reuse it for the Outfits list (dress code plus fresh-first) and the Surprise Me occasion picker.

### 3.2 ItemCard v2

- Use `expo-image` with `placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}`, `transition={200}`, `cachePolicy="memory-disk"`, `contentFit="cover"`.
- Image wrap gets `aspectRatio: 3 / 4` instead of `height: 130`, matching the 3:4 capture in AddItem.
- Badges (laundry, favorite, repair) become `PillBadge` with icons using `onAccent`.
- Wrap in `Pressable` with a Reanimated `withSpring` scale to 0.97 on press-in.
- `onLongPress` opens an `ActionSheet` with Log wear, Toggle laundry, Toggle favorite; each fires `haptic.light()` and a toast.
- On the grids: `initialNumToRender={8}`, `windowSize={7}`, `removeClippedSubviews` on Android, and `getItemLayout` now that the card height is derivable from the column width.

### 3.3 Today hero

The top of Today becomes the app's signature moment:

- `expo-linear-gradient` using the `theme.gradient` pair that is defined for every theme and never used, with big date, weather glyph and temperature, plus a "mock weather" pill when `weather.mocked` is true.
- A 2x2 collage of top / bottom / shoes / outerwear photos replaces the 50px rows. Extract it as `src/components/OutfitCollage.js` and reuse in Surprise Me and the Outfits list rows.
- Two pill buttons: "Wear this" (logs every piece, `haptic.success()`, toast "Outfit logged") and "Surprise me" (navigates to the shuffle screen; the current "Shuffle Suggestion" button calls the deterministic endpoint and never changes).
- Skeleton while loading, `ErrorState` on failure, and a friendly "Add a top, bottom and shoes to get suggestions" empty state with a button when `missing.length`.
- Extract `WeatherPill.js` and use it in Today, Surprise Me and Packing List instead of three hand-written weather cards.

### 3.4 Stats

- Charts take `width` from `onLayout` (quick win 1.2).
- `src/components/StatTile.js` (icon, value, label, optional trend) replaces the three stat-card implementations in Stats, ItemDetail and Wishlist summary.
- Utilization becomes an SVG ring (`react-native-svg` `Circle` with `strokeDasharray`, animated with `Animated.Value` and `useNativeDriver: false`).
- Replace the second `h1` mid-page (`StatsScreen.js` line 141) with a segmented control "Overview / Insights".
- "Least worn" as a horizontal scroll of `ItemCard`s, which is far more useful than a bar of names.
- Only refetch the timeline when the 7/30/90 range changes; the other four endpoints do not depend on it.
- Move `COLOR_SWATCHES` to `src/constants/colors.js`.

### 3.5 Navigation and first run

- Tab bar: six unlabeled icons is too many to learn. Show 10px labels, or animate a label in on the active tab with Reanimated layout transitions. Consider five tabs by merging Stats into Calendar as "Insights" with a segmented control.
- Revive `src/components/Fab.js` (already written, never imported) as the centre "+" action with a quick-add sheet: Add item, New outfit, Add to wishlist, New poll. That also gives Polls a permanent entry point.
- Onboarding: a three-slide carousel after registration (add a photo, log a wear, get a suggestion), stored under `onboarded` in AsyncStorage, and an "Add your first 3 items" checklist card on the empty Wardrobe.
- Startup: call `SplashScreen.preventAutoHideAsync()` at module top in `App.js`, load theme, fonts and auth in parallel, then `hideAsync()`. Today `ThemeContext.js` line 38 returns `null` until AsyncStorage resolves, which shows a blank frame after the native splash.

---

## Order of work and effort

| Step | Effort | Unlocks |
|---|---|---|
| Part 1 quick wins | S | Visible defects gone in a day |
| 2.1 Screen shell | M | One header language, keyboard handling everywhere |
| 2.2 Skeleton / ErrorState / useFocusedFetch | M | Fixes 11 silent failures and 4 double-fetch bugs |
| 2.3 Toast + haptics | S | Every action feels acknowledged |
| 2.4 Form system | M | Inline validation, date pickers, sticky save |
| 3.1 Wardrobe filters | M | Screen the user lives in |
| 3.2 ItemCard v2 | M | Reused by Wardrobe, CreateOutfit, OutfitDetail, Stats |
| 3.3 Today hero | M | Signature screen |
| 3.4 Stats | M | |
| 3.5 Navigation and first run | L | |

Ship Part 1 plus 2.1 to 2.3 as one release; the app will already feel like a different product. Parts 2.4 and 3 can go screen by screen after that.
