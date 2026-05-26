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

type UploadDocumentsRoute = RouteProp<TravelStackParamList, 'UploadDocuments'>;
type UploadDocumentsNav = NativeStackNavigationProp<TravelStackParamList, 'UploadDocuments'>;

export default function UploadDocumentsScreen() {
  const route = useRoute<UploadDocumentsRoute>();
  const navigation = useNavigation<UploadDocumentsNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Upload Documents" subtitle="Placeholder area for future ID/document upload handling." />

        <AppCard style={styles.card}>
          <Text style={styles.title}>Booking ID: {route.params.bookingId}</Text>
          <Text style={styles.text}>Add passport, ID card, or travel-specific files later.</Text>
          <View style={styles.uploadBox}>
            <Text style={styles.uploadTitle}>Document upload placeholder</Text>
          </View>
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
  text: { color: theme.colors.textMuted, lineHeight: 20, marginBottom: theme.spacing.md },
  uploadBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  uploadTitle: { color: theme.colors.textSoft, fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold },
});
