import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { MainTabParamList } from '../../navigators/MainTabNavigator';

type ProfileNav = BottomTabNavigationProp<MainTabParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Profile" subtitle="User profile shell with placeholder account actions." />

        <AppCard style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.name}>{user?.name ?? 'Guest User'}</Text>
          <Text style={styles.text}>Profile data and preferences can be added here later.</Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton title="Settings" onPress={() => navigation.getParent()?.navigate('Settings' as never)} />
          <AppButton title="Help & Support" onPress={() => navigation.getParent()?.navigate('HelpSupport' as never)} variant="secondary" />
          <AppButton title="Collector Dashboard" onPress={() => navigation.getParent()?.navigate('CollectorDashboard' as never)} variant="secondary" />
          <AppButton title="Logout" onPress={logout} variant="secondary" />
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
  actions: {
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.sm,
  },
  text: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
