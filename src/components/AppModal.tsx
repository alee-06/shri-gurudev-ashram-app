import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import { theme } from '../constants/theme';

type AppModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
};

export default function AppModal({
  visible,
  title,
  description,
  confirmLabel = 'Continue',
  onConfirm,
  onClose,
}: AppModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => null}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {onConfirm ? <AppButton title={confirmLabel} onPress={onConfirm} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  description: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
});
