import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type LoadingStateProps = {
  message?: string;
};

export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  text: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
  },
});
