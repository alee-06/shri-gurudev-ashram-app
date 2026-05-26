import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { MainStackParamList } from '../../navigators/MainStackNavigator';

type SettingsNav = NativeStackNavigationProp<MainStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Settings" subtitle="Minimal settings placeholder for designer handoff." />

        <AppCard style={styles.card}>
          <Text style={styles.title}>App preferences</Text>
          <Text style={styles.text}>Theme, notifications, language, and privacy controls can live here later.</Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton title="Help & Support" onPress={() => navigation.navigate('HelpSupport')} />
          <AppButton title="Collector Portal" onPress={() => navigation.navigate('CollectorDashboard')} variant="secondary" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.xs },
  text: { color: theme.colors.textMuted, lineHeight: 20 },
  actions: { gap: theme.spacing.md },
});
