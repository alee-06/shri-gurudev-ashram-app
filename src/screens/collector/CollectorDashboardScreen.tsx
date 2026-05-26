import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { collectorTasks } from '../../services/mockData';
import { MainStackParamList } from '../../navigators/MainStackNavigator';

type CollectorDashboardNav = NativeStackNavigationProp<MainStackParamList>;

export default function CollectorDashboardScreen() {
  const navigation = useNavigation<CollectorDashboardNav>();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Collector Dashboard" subtitle="Placeholder operations area for verification workflow." />

        {collectorTasks.map((task) => (
          <AppCard key={task.id} style={styles.card}>
            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.text}>{task.description}</Text>
            <Text style={styles.status}>Status: {task.status}</Text>
          </AppCard>
        ))}

        <AppButton title="Open Verification" onPress={() => navigation.navigate('CollectorVerification', { bookingId: 'BK-000245' })} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.xs },
  text: { color: theme.colors.textMuted, lineHeight: 20, marginBottom: theme.spacing.xs },
  status: { color: theme.colors.primary, fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.semibold },
});
