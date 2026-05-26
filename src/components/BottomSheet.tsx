import React, { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function BottomSheet({ visible, title, subtitle, onClose, children }: BottomSheetProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => null}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
  },
});
