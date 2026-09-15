import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { localDateStr, parseLocalDate } from '../utils/dates';

// Native date picker that reads/writes YYYY-MM-DD strings, so the rest of
// the app (and the API) keeps its existing date format.
export default function DateField({ label, value, onChange, minimumDate, maximumDate, error, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [open, setOpen] = useState(false);
  const date = value ? parseLocalDate(value) : new Date();

  const pick = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(localDateStr(selected));
        },
      });
    } else {
      setOpen((v) => !v);
    }
  };

  const pretty = value
    ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Pick a date';

  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity onPress={pick} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${label}: ${pretty}`} style={[styles.field, error && { borderColor: theme.colors.danger }]}>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
        <Text style={[theme.typography.body, { marginLeft: 10, flex: 1 }]}>{pretty}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textFaint} />
      </TouchableOpacity>
      {error ? <Text style={[theme.typography.caption, { color: theme.colors.danger, marginTop: 4 }]}>{error}</Text> : null}
      {Platform.OS === 'ios' && open && (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={theme.colors.accent}
            themeVariant={theme.mode}
            onChange={(event, selected) => { if (selected) onChange(localDateStr(selected)); }}
          />
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  label: { ...theme.typography.label, marginBottom: 6, textTransform: 'uppercase' },
  field: {
    flexDirection: 'row', alignItems: 'center', minHeight: 48,
    backgroundColor: theme.colors.surface, borderWidth: theme.border.width, borderColor: theme.colors.text,
    borderRadius: theme.radius.md, paddingHorizontal: 14,
  },
  iosPicker: {
    marginTop: 8, borderRadius: theme.radius.md, borderWidth: theme.border.width, borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface, overflow: 'hidden',
  },
});
