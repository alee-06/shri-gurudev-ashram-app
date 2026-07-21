import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { theme } from '../constants/theme';

export type AppInputProps = TextInputProps & {
  label: string;
  errorMessage?: string | null;
};

const AppInput = forwardRef<TextInput, AppInputProps>(
  ({ label, style, errorMessage, ...props }, ref) => {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          ref={ref}
          {...props}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, errorMessage ? styles.inputError : null, style]}
        />
        {!!errorMessage && (
          <Animated.Text entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.errorText}>
            {errorMessage}
          </Animated.Text>
        )}
      </View>
    );
  }
);

AppInput.displayName = 'AppInput';

export default AppInput;

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
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
  },
  inputError: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF8F8',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
