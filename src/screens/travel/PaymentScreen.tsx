import React, { useState } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { TravelStackParamList } from '../../navigators/TravelStackNavigator';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

type PaymentRoute = RouteProp<TravelStackParamList, 'Payment'>;
type PaymentNav = NativeStackNavigationProp<TravelStackParamList, 'Payment'>;

export default function PaymentScreen() {
  const route = useRoute<PaymentRoute>();
  const navigation = useNavigation<PaymentNav>();
  const utr = useBookingDraftStore((state) => state.utr);
  const proofLabel = useBookingDraftStore((state) => state.proofLabel);
  const updateField = useBookingDraftStore((state) => state.updateField);

  const { packageName, totalAmount } = route.params;

  const handleSubmit = () => {
    // Real payment capture is intentionally skipped in this boilerplate.
    navigation.navigate('Success');
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Payment" subtitle="Placeholder payment proof submission flow." />

        <AppCard>
          <Text style={styles.label}>Selected Package</Text>
          <Text style={styles.value}>{packageName}</Text>

          <Text style={styles.label}>Total Amount</Text>
          <Text style={styles.amount}>{totalAmount}</Text>

          <Text style={styles.label}>UPI QR</Text>
          {/* The QR box is intentionally a placeholder so the UI is ready without real payment logic. */}
          <View style={styles.qrBox}>
            <Text style={styles.placeholderText}>QR Placeholder</Text>
          </View>

          <Text style={styles.label}>Payment Instructions</Text>
          <Text style={styles.instructions}>
            Scan the QR placeholder, complete the transfer, then add your UTR / Transaction ID and
            payment proof.
          </Text>

          <Text style={styles.label}>UTR / Transaction ID</Text>
          <TextInput
            value={utr}
            onChangeText={(text) => updateField('utr', text)}
            placeholder="Enter transaction ID"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Upload Payment Proof</Text>
          <Pressable
            style={styles.uploadBox}
            onPress={() => updateField('proofLabel', 'Screenshot placeholder selected')}
          >
            <Text style={styles.uploadTitle}>Tap to add screenshot</Text>
            <Text style={styles.uploadHint}>{proofLabel || 'Image upload placeholder'}</Text>
          </Pressable>
        </AppCard>

        <AppButton title="Submit Payment Proof" onPress={handleSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  value: {
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  amount: {
    marginBottom: theme.spacing.md,
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.extrabold,
  },
  qrBox: {
    height: 180,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  instructions: {
    marginBottom: theme.spacing.md,
    color: theme.colors.textSoft,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
  input: {
    minHeight: 48,
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
  },
  uploadBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  uploadHint: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
});
