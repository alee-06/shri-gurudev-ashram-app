import React from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { bookingHistory } from '../../services/mockData';
import { TravelStackParamList } from '../../navigators/TravelStackNavigator';

type BookingDetailsRoute = RouteProp<TravelStackParamList, 'BookingDetails'>;
type BookingDetailsNav = NativeStackNavigationProp<TravelStackParamList, 'BookingDetails'>;

export default function BookingDetailsScreen() {
  const route = useRoute<BookingDetailsRoute>();
  const navigation = useNavigation<BookingDetailsNav>();
  const booking = bookingHistory.find((item) => item.bookingId === route.params.bookingId) ?? bookingHistory[0];

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Booking Details" subtitle="Detailed booking placeholder for handoff and navigation." />

        <AppCard style={styles.card}>
          <Text style={styles.label}>Booking ID</Text>
          <Text style={styles.value}>{booking.bookingId}</Text>
          <Text style={styles.label}>Package</Text>
          <Text style={styles.value}>{booking.packageName}</Text>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>{booking.amount}</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{booking.status}</Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton title="View Status" onPress={() => navigation.navigate('BookingStatus', { bookingId: booking.bookingId })} />
          <AppButton title="Upload Documents" onPress={() => navigation.navigate('UploadDocuments', { bookingId: booking.bookingId })} variant="secondary" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.lg },
  label: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.semibold, marginTop: theme.spacing.sm },
  value: { color: theme.colors.text, fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing.xs },
  actions: { gap: theme.spacing.md },
});
