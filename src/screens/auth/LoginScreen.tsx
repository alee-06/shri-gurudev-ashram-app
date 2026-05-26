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

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Mock sign-in keeps the boilerplate lightweight while still demonstrating the auth shell.
    setUser({ id: 'u-1', name: email || 'Guest User', role: 'member' });
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Login" subtitle="Use a placeholder account to enter the app shell." />
        <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="Enter email" autoCapitalize="none" />
        <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
        <View style={styles.actions}>
          <AppButton title="Login" onPress={handleLogin} />
          <AppButton title="Forgot Password" onPress={() => navigation.navigate('ForgotPassword')} variant="secondary" />
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
