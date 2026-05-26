import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AppCard from '../../components/AppCard';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { TravelStackParamList } from '../../navigators/TravelStackNavigator';
import { travelPackages } from '../../services/mockData';

type TravelNav = NativeStackNavigationProp<TravelStackParamList, 'TravelList'>;

export default function TravelScreen() {
  const navigation = useNavigation<TravelNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Travel" subtitle="Placeholder travel packages for the main travel flow." />

        <FlatList
          data={travelPackages}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <AppCard onPress={() => navigation.navigate('PackageDetails', { packageItem: item })}>
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imageText}>Image Placeholder</Text>
              </View>

              <View style={styles.body}>
                <View style={styles.row}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.price}>{item.price}</Text>
                </View>
                <Text style={styles.duration}>{item.duration}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </AppCard>
          )}
        />

        <View style={styles.footerActions}>
          <AppButton title="View Booking History" onPress={() => navigation.navigate('BookingHistory')} variant="secondary" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  separator: {
    height: theme.spacing.md,
  },
  imagePlaceholder: {
    height: 150,
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
  body: {
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  price: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  duration: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  description: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
  footerActions: {
    marginTop: theme.spacing.lg,
  },
});
