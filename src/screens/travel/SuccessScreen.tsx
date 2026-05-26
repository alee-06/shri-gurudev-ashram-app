import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { TravelStackParamList } from '../../navigators/TravelStackNavigator';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

type SuccessNav = NativeStackNavigationProp<TravelStackParamList, 'Success'>;

export default function SuccessScreen() {
  const navigation = useNavigation<SuccessNav>();
  const resetDraft = useBookingDraftStore((state) => state.resetDraft);

  const handleBackHome = () => {
    resetDraft();
    navigation.getParent()?.navigate('Home' as never);
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppCard style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>

          <Text style={styles.title}>Booking Submitted Successfully</Text>
          <Text style={styles.bookingId}>Booking ID: BK-000245</Text>
          <Text style={styles.message}>
            Your booking is submitted. Admin will verify payment and confirm your reservation soon.
          </Text>
        </AppCard>

        {/* The button uses the parent tab navigator so the user returns to the main shell. */}
        <AppButton title="Back to Home" onPress={handleBackHome} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  iconText: {
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: theme.typography.weights.bold,
    lineHeight: 34,
  },
  title: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  bookingId: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  message: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.textSoft,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
});
