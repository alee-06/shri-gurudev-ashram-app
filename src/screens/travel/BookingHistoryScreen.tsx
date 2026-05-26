import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { bookingHistory } from '../../services/mockData';
import { TravelStackParamList } from '../../navigators/TravelStackNavigator';

type BookingHistoryNav = NativeStackNavigationProp<TravelStackParamList, 'BookingHistory'>;

export default function BookingHistoryScreen() {
  const navigation = useNavigation<BookingHistoryNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Booking History" subtitle="Dummy list of past bookings for designer review." />

        <FlatList
          data={bookingHistory}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <AppCard onPress={() => navigation.navigate('BookingDetails', { bookingId: item.bookingId })}>
              <Text style={styles.bookingId}>{item.bookingId}</Text>
              <Text style={styles.title}>{item.packageName}</Text>
              <Text style={styles.text}>{item.travelDate}</Text>
              <Text style={styles.status}>Status: {item.status}</Text>
            </AppCard>
          )}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: theme.spacing.lg },
  separator: { height: theme.spacing.md },
  bookingId: { color: theme.colors.primary, fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.xs },
  title: { color: theme.colors.text, fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.xs },
  text: { color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  status: { color: theme.colors.textSoft, fontSize: theme.typography.sizes.sm },
});
