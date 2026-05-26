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

type ForgotPasswordNav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNav>();
  const [email, setEmail] = useState('');

  const handleSend = () => {
    // No real reset logic yet; this is only a design-ready placeholder.
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Forgot Password" subtitle="Reset flow placeholder for future backend integration." />
        <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="Enter email" autoCapitalize="none" />
        <View style={styles.actions}>
          <AppButton title="Send Reset Link" onPress={handleSend} />
          <AppButton title="Back to Login" onPress={() => navigation.navigate('Login')} variant="secondary" />
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
