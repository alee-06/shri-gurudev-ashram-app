import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import { theme } from '../constants/theme';

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <AppButton title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  message: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
