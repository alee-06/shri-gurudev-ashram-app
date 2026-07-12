import React, { useEffect, useState } from 'react'
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { collectorTasks } from '../src/services/mockData'
import CollectorIDCard from '../src/components/CollectorIDCard'
import { useAuthStore } from '../src/store/useAuthStore'

const stats = [
  { label: 'Assigned yatris', value: '128', icon: 'groups' },
  { label: 'Payment pending', value: '42', icon: 'hourglass-empty' },
  { label: 'Paid bookings', value: '86', icon: 'check-circle' },
  { label: 'Upcoming yatras', value: '18', icon: 'event-note' },
]

export default function CollectorDashboardRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const [showIDCard, setShowIDCard] = useState(false)

  useEffect(() => {
    if (!isHydrated) return
    if (!user || user.role !== 'collector') {
      router.replace('/(tabs)/home' as never)
    }
  }, [isHydrated, user, router])

  // Do not render content while auth is hydrating or role is invalid
  if (!isHydrated || !user || user.role !== 'collector') {
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={collectorTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.headerBlock, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
            <BlurView intensity={25} tint="light" style={styles.headerGlass}>
              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text style={styles.kicker}>Namaste, Collector</Text>
                  <Text style={styles.title}>Premium spiritual operations</Text>
                  <Text style={styles.subtitle}>Manage paid bookings, pending payments, and journey follow-ups with calm precision.</Text>
                </View>
                <Pressable style={styles.analyticsButton}>
                  <MaterialIcons name="timeline" size={20} color="#8B5A00" />
                </Pressable>
              </View>

              <View style={styles.quickStatsGrid}>
                {stats.map((stat) => (
                  <View key={stat.label} style={styles.statCard}>
                    <LinearGradient colors={['#7A4B00', '#B97712']} style={styles.statIcon}>
                      <MaterialIcons name={stat.icon as any} size={18} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryTopRow}>
                  <View>
                    <Text style={styles.summaryLabel}>Daily booking summary</Text>
                    <Text style={styles.summaryValue}>42 bookings awaiting Razorpay payment</Text>
                  </View>
                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryPillText}>74% complete</Text>
                  </View>
                </View>
                <View style={styles.summaryBarTrack}>
                  <LinearGradient colors={['#7B4B00', '#B97712', '#E0A31F']} style={styles.summaryBarFill} />
                </View>
              </View>
            </BlurView>

            {/* My Digital ID Section */}
            {user ? (
              <View style={styles.idSection}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>My Digital ID</Text>
                  <View style={styles.idBadge}>
                    <MaterialIcons name="verified" size={13} color="#2F7132" />
                    <Text style={styles.idBadgeText}>Official</Text>
                  </View>
                </View>

                <View style={styles.idActionsRow}>
                  <Pressable
                    style={styles.idActionBtn}
                    onPress={() => setShowIDCard(true)}
                  >
                    <MaterialIcons name="badge" size={20} color="#8B5A00" />
                    <Text style={styles.idActionText}>View ID</Text>
                  </Pressable>

                  <Pressable
                    style={styles.idActionBtn}
                    onPress={() => Alert.alert('Share', 'Share feature coming soon.')}
                  >
                    <MaterialIcons name="share" size={20} color="#8B5A00" />
                    <Text style={styles.idActionText}>Share</Text>
                  </Pressable>

                  <Pressable
                    style={styles.idActionBtn}
                    onPress={() => Alert.alert('Download', 'Download feature coming soon.')}
                  >
                    <MaterialIcons name="download" size={20} color="#8B5A00" />
                    <Text style={styles.idActionText}>Download</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* ID Card Modal */}
            <Modal
              visible={showIDCard}
              transparent
              animationType="slide"
              onRequestClose={() => setShowIDCard(false)}
            >
              <Pressable style={styles.modalBackdrop} onPress={() => setShowIDCard(false)}>
                <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Collector ID Card</Text>
                  {user ? <CollectorIDCard user={user} /> : null}
                  <Pressable
                    style={styles.modalClose}
                    onPress={() => setShowIDCard(false)}
                  >
                    <LinearGradient
                      colors={['#7B4B00', '#B97512', '#E0A31F']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalCloseGradient}
                    >
                      <Text style={styles.modalCloseText}>Close</Text>
                    </LinearGradient>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>

            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Operations queue</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.taskCard}>
            <View style={styles.taskIcon}>
              <MaterialIcons name="event-note" size={22} color="#8B5A00" />
            </View>
            <View style={styles.taskCopy}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <Text style={styles.taskDescription}>{item.description}</Text>
              <Text style={styles.taskStatus}>{item.status}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F3EA' },
  listContent: { paddingBottom: 110 },
  headerBlock: { paddingHorizontal: 18, paddingBottom: 8 },
  headerGlass: {
    borderRadius: 34,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headerCopy: { flex: 1 },
  kicker: { color: '#8B5A00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  title: { color: '#2C1D10', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  subtitle: { color: '#6B5A4A', fontSize: 13, lineHeight: 20, marginTop: 8 },
  analyticsButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  quickStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', borderRadius: 22, backgroundColor: '#fff', padding: 14, borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)' },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#2C1D10', fontSize: 20, fontWeight: '900', marginTop: 10 },
  statLabel: { color: '#6B5A4A', fontSize: 11, fontWeight: '800', marginTop: 3 },
  summaryCard: { marginTop: 14, borderRadius: 24, backgroundColor: '#FFF9F0', padding: 16, borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)' },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { color: '#8B5A00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  summaryValue: { color: '#2C1D10', fontSize: 17, fontWeight: '900', marginTop: 5 },
  summaryPill: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 7 },
  summaryPillText: { color: '#8B5A00', fontSize: 11, fontWeight: '900' },
  summaryBarTrack: { height: 8, backgroundColor: '#F0E7DD', borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  summaryBarFill: { width: '74%', height: '100%' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
  sectionTitle: { color: '#2C1D10', fontSize: 20, fontWeight: '900' },
  seeAll: { color: '#8B5A00', fontSize: 13, fontWeight: '900' },
  taskCard: { marginHorizontal: 18, marginBottom: 12, flexDirection: 'row', gap: 14, backgroundColor: '#fff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)' },
  taskIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center' },
  taskCopy: { flex: 1 },
  taskTitle: { color: '#2C1D10', fontSize: 16, fontWeight: '900' },
  taskDescription: { color: '#6B5A4A', fontSize: 13, lineHeight: 20, marginTop: 4 },
  taskStatus: { color: '#8B5A00', fontSize: 12, fontWeight: '900', marginTop: 8 },

  // My Digital ID
  idSection: { marginTop: 18, paddingHorizontal: 4 },
  idBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF8EF', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  idBadgeText: { color: '#2F7132', fontSize: 11, fontWeight: '800' },
  idActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  idActionBtn: {
    flex: 1, alignItems: 'center', gap: 6, padding: 14,
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#F0E7DD',
    shadowColor: '#5B4636', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  idActionText: { color: '#8B5A00', fontSize: 12, fontWeight: '800' },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(32,19,9,0.52)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAF6F0', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 20, paddingBottom: 36, gap: 16,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  modalHandle: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: '#E8D5BE',
    alignSelf: 'center', marginBottom: 4,
  },
  modalTitle: { color: '#2B231B', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  modalClose: { marginTop: 4 },
  modalCloseGradient: { minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: '900' },
})
