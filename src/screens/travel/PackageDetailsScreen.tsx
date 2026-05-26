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
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

type DetailsRoute = RouteProp<TravelStackParamList, 'PackageDetails'>;
type DetailsNav = NativeStackNavigationProp<TravelStackParamList, 'PackageDetails'>;

export default function PackageDetailsScreen() {
  const route = useRoute<DetailsRoute>();
  const navigation = useNavigation<DetailsNav>();
  const setSelectedPackage = useBookingDraftStore((state) => state.setSelectedPackage);
  const { packageItem } = route.params;

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Package Details" subtitle="Placeholder detail view for the selected travel package." />

        <AppCard style={styles.card}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>Image Placeholder</Text>
          </View>

          <Text style={styles.title}>{packageItem.title}</Text>
          <Text style={styles.meta}>{packageItem.duration}</Text>
          <Text style={styles.price}>{packageItem.price}</Text>
          <Text style={styles.description}>{packageItem.description}</Text>
        </AppCard>

        {/* Continue the travel flow into booking without introducing business logic yet. */}
        <AppButton
          title="Proceed to Booking"
          onPress={() => {
            setSelectedPackage(packageItem);
            navigation.navigate('BookingForm', { packageItem });
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  imagePlaceholder: {
    height: 180,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  imageText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.xs,
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.sm,
  },
  price: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.sm,
  },
  description: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
});
