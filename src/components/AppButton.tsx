import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary';
};

export default function AppButton({ title, onPress, style, variant = 'primary' }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  secondary: {
    backgroundColor: theme.colors.primarySoft,
  },
  pressed: {
    opacity: 0.92,
  },
  text: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  secondaryText: {
    color: theme.colors.primary,
  },
});
