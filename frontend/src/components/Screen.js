import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

// The one screen shell. Gives every screen the same header language (Playfair
// title + muted subtitle + right-side actions), safe-area top inset, optional
// scrolling with pull-to-refresh, keyboard avoidance for forms, and the bottom
// inset that keeps content clear of the floating tab bar.
//
//   <Screen title="Outfits" right={<IconButton .../>} scroll onRefresh={refresh}>
//
// Props:
//   title, subtitle     header text (omit title for no header)
//   right               node rendered on the header's right side
//   scroll              wrap children in a ScrollView (default false)
//   keyboard            wrap in KeyboardAvoidingView (forms)
//   refreshing/onRefresh pull-to-refresh (scroll mode only)
//   padded              horizontal padding on the body (default true)
//   tabInset            bottom padding for the floating tab bar (default true)
//   safeTop             add the status-bar inset (default true; false when a
//                       native stack header is already showing)
//   footer              node pinned below the body (e.g. <StickyFooter>), kept
//                       outside the ScrollView so it never scrolls away
export default function Screen({
  title,
  subtitle,
  right,
  children,
  footer,
  scroll = false,
  keyboard = false,
  refreshing = false,
  onRefresh,
  padded = true,
  tabInset = true,
  safeTop = true,
  style,
  contentStyle,
  headerStyle,
  keyboardOffset = 0,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pad = theme.layout.screenPadding;

  const header = title ? (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: pad, marginBottom: 14 }, headerStyle]}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={theme.typography.h1} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={[theme.typography.bodyMuted, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{right}</View> : null}
    </View>
  ) : null;

  const paddingTop = (safeTop ? insets.top : 0) + (title ? 14 : 8);
  const paddingBottom = tabInset ? theme.layout.tabBarInset : insets.bottom + 24;

  let body;
  if (scroll) {
    body = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingTop, paddingBottom }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} colors={[theme.colors.accent]} progressViewOffset={safeTop ? insets.top : 0} />
          ) : undefined
        }
      >
        {header}
        <View style={{ paddingHorizontal: padded ? pad : 0 }}>{children}</View>
      </ScrollView>
    );
  } else {
    body = (
      <View style={[{ flex: 1, paddingTop }, contentStyle]}>
        {header}
        <View style={{ flex: 1, paddingHorizontal: padded ? pad : 0 }}>{children}</View>
      </View>
    );
  }

  const root = (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
      {body}
      {footer}
    </View>
  );
  if (!keyboard) return root;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardOffset}>
      {root}
    </KeyboardAvoidingView>
  );
}
