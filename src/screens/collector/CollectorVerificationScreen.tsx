import React from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { MainStackParamList } from '../../navigators/MainStackNavigator';

type CollectorVerificationRoute = RouteProp<MainStackParamList, 'CollectorVerification'>;
type CollectorVerificationNav = NativeStackNavigationProp<MainStackParamList>;

export default function CollectorVerificationScreen() {
  const route = useRoute<CollectorVerificationRoute>();
  const navigation = useNavigation<CollectorVerificationNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Collector Verification" subtitle="Placeholder review screen for booking validation." />

        <AppCard style={styles.card}>
          <Text style={styles.title}>Booking ID: {route.params.bookingId}</Text>
          <Text style={styles.text}>Review the proof, check the details, and approve or reject later.</Text>
          <Text style={styles.text}>No live backend logic is wired yet.</Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton title="Approve" onPress={() => navigation.goBack()} />
          <AppButton title="Reject" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.sm },
  text: { color: theme.colors.textMuted, lineHeight: 20, marginBottom: theme.spacing.xs },
  actions: { gap: theme.spacing.md },
});
