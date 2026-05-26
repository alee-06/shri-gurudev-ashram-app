import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../constants/theme';

type AppInputProps = TextInputProps & {
  label: string;
};

export default function AppInput({ label, style, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={theme.colors.textMuted} style={[styles.input, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  input: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
  },
});
