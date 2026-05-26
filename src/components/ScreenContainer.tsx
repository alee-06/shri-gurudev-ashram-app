import React, { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { theme } from '../constants/theme';

type ScreenContainerProps = {
  children: ReactNode;
};

// Shared screen wrapper keeps spacing and background color consistent across the app.
export default function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
