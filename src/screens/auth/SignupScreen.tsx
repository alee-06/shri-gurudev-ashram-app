import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { AuthStackParamList } from '../../navigators/AuthNavigator';
import { useAuthStore } from '../../store/useAuthStore';

type SignupNav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export default function SignupScreen() {
  const navigation = useNavigation<SignupNav>();
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSignup = () => {
    // Mock sign-up mirrors the login flow so the shell stays demo-friendly.
    setUser({ id: 'u-2', name: name || email || 'New User', role: 'member' });
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Create Account" subtitle="Placeholder onboarding flow for future product work." />
        <AppInput label="Full Name" value={name} onChangeText={setName} placeholder="Enter full name" />
        <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="Enter email" autoCapitalize="none" />
        <View style={styles.actions}>
          <AppButton title="Create Account" onPress={handleSignup} />
          <AppButton title="Back to Splash" onPress={() => navigation.navigate('Splash')} variant="secondary" />
          <AppButton title="Back" onPress={() => navigation.goBack()} variant="secondary" />
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
  actions: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
});
