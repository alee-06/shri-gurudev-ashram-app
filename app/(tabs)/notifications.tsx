import React, { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { getNotifications, markNotificationAsRead, type NotificationItem } from '../../src/services/notifications'
import { useAuthStore } from '../../src/store/useAuthStore'

export default function NotificationsRoute() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const isHydrated = useAuthStore(s => s.isHydrated)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch (e) {
      console.warn('Failed to fetch notifications', e)
    }
  }

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    await fetchNotifications()
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    if (isHydrated && user) void loadData()
    else if (isHydrated && !user) setLoading(false)
  }, [isHydrated, user])

  const handlePress = async (item: NotificationItem) => {
    if (item.is_read) return
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
    try {
      await markNotificationAsRead(item.id)
    } catch (e) {
      // Revert on failure
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: false } : n))
      console.warn('Failed to mark notification as read', e)
    }
  }

  if (loading) {
    return <SafeAreaView style={[styles.container, styles.center]}><ActivityIndicator color="#8B5A00" /></SafeAreaView>
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialIcons name="lock-outline" size={48} color="#D7C7B8" />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptyText}>Sign in to view your notifications.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#8B5A00" />}
        ListEmptyComponent={
          <View style={styles.centerCard}>
            <MaterialIcons name="notifications-none" size={48} color="#D7C7B8" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up on Ashram updates.</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>Ashram updates</Text>
            <Text style={styles.title}>Notifications</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePress(item)} style={[styles.card, !item.is_read && styles.cardUnread]}>
            <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
              <MaterialIcons name={item.is_read ? "campaign" : "notifications-active"} size={22} color={item.is_read ? "#8B5A00" : "#E65C00"} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 14 },
  header: { marginBottom: 6 },
  kicker: { color: '#E65C00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3 },
  title: { color: '#2B231B', fontSize: 32, fontWeight: '900', marginTop: 4 },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E7DD',
    shadowColor: '#5B4636',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardUnread: { backgroundColor: '#FFFAED', borderColor: '#FFE4B5' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center' },
  iconWrapUnread: { backgroundColor: '#FFEDD5' },
  copy: { flex: 1 },
  cardTitle: { color: '#2B231B', fontSize: 16, fontWeight: '900' },
  message: { color: '#7E7162', fontSize: 13, lineHeight: 20, marginTop: 5 },
  time: { color: '#E65C00', fontSize: 12, fontWeight: '800', marginTop: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E65C00', position: 'absolute', top: 16, right: 16 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerCard: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, marginTop: 64 },
  emptyTitle: { color: '#2C1D10', fontSize: 20, fontWeight: '900', marginTop: 8 },
  emptyText: { color: '#6B5A4A', fontSize: 14, textAlign: 'center' },
})
