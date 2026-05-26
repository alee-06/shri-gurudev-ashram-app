import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { notifications } from '../../services/mockData';

export default function HelpSupportScreen() {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Help & Support" subtitle="Placeholder help center for the frontend skeleton." />

        {notifications.slice(0, 2).map((item) => (
          <AppCard key={item.id} style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.message}</Text>
          </AppCard>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.xs },
  text: { color: theme.colors.textMuted, lineHeight: 20 },
});
