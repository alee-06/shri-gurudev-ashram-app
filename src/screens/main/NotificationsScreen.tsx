import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppCard from '../../components/AppCard';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import ScreenContainer from '../../components/ScreenContainer';
import { theme } from '../../constants/theme';
import { notifications } from '../../services/mockData';

export default function NotificationsScreen() {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppHeader title="Notifications" subtitle="Placeholder notifications tab for future alerts and updates." />

        {notifications.length > 0 ? (
          notifications.map((item) => (
            <AppCard key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.text}>{item.message}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="No notifications yet"
            message="This tab is reserved for booking updates, reminders, and admin messages."
          />
        )}
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
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.xs,
  },
  text: {
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  time: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
});
