import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { MainTabParamList } from '../../navigators/MainTabNavigator';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Home" subtitle="Main tab landing area with placeholder quick actions." />

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardText}>
            This boilerplate is structured for scalable feature work, while keeping the UI minimal.
          </Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton title="Open Travel" onPress={() => navigation.navigate('Travel')} />
            <AppButton title="Settings" onPress={() => navigation.getParent()?.navigate('Settings' as never)} variant="secondary" />
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
  card: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.xs,
  },
  cardText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.md,
  },
});
