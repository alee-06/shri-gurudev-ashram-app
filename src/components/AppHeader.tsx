import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
});
