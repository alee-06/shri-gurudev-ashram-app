import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { AuthStackParamList } from '../../navigators/AuthNavigator';

type SplashNav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Travel Admin" subtitle="Designer handoff shell with placeholder flows only." />

        <AppCard style={styles.card}>
          <Text style={styles.label}>Splash Screen</Text>
          <Text style={styles.text}>
            This screen introduces the app and gives quick access to the authentication flow.
          </Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton title="Login" onPress={() => navigation.navigate('Login')} />
          <AppButton title="Create Account" onPress={() => navigation.navigate('Signup')} variant="secondary" />
        </View>
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
    marginBottom: theme.spacing.lg,
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  text: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.md,
  },
});
