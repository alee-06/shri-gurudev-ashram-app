import React from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { TravelStackParamList } from '../../navigators/TravelStackNavigator';

type BookingStatusRoute = RouteProp<TravelStackParamList, 'BookingStatus'>;
type BookingStatusNav = NativeStackNavigationProp<TravelStackParamList, 'BookingStatus'>;

export default function BookingStatusScreen() {
  const route = useRoute<BookingStatusRoute>();
  const navigation = useNavigation<BookingStatusNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Booking Status" subtitle="Minimal status timeline placeholder." />

        <AppCard style={styles.card}>
          <Text style={styles.title}>Booking ID: {route.params.bookingId}</Text>
          <Text style={styles.text}>Pending → Verified → Confirmed</Text>
          <Text style={styles.text}>This flow can later show live progress from the backend.</Text>
        </AppCard>

        <AppButton title="Back to Details" onPress={() => navigation.goBack()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.sm },
  text: { color: theme.colors.textMuted, lineHeight: 20, marginBottom: theme.spacing.xs },
});
