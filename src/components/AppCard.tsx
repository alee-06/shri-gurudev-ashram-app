import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

type AppCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// Reusable card shell for placeholder content and lightweight tap targets.
export default function AppCard({ children, style, onPress }: AppCardProps) {
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed, style]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
