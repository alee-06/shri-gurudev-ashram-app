import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { SEVA_LABELS } from '../../src/constants/seva'
import SevaReceipt from '../../src/components/SevaReceipt'
import type { SevaBooking } from '../../src/types/seva'
import { fetchSevaHistory } from '../../src/services/seva'
import { getBookingsByUser } from '../../src/services/bookings'
import type { Booking } from '../../src/types/travel'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useProtectedRoute } from '../../src/hooks/useProtectedRoute'

// ─── Categories & Tabs ────────────────────────────────────────────────────────
type CategoryKey = 'all' | 'annadan' | 'yajman' | 'travel'
const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'annadan', label: 'Annadan' },
  { key: 'yajman', label: 'Guruji Aarti' },
  { key: 'travel', label: 'Travel' },
]

type TabKey = 'upcoming' | 'completed' | 'cancelled'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

type ActivityItem = {
  id: string
  category: 'annadan' | 'yajman' | 'travel'
  title: string
  subtitle: string
  date: string
  reference: string
  amount: number
  status: string
  rawSeva?: SevaBooking
  rawTravel?: Booking
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

function statusColor(status: string): string {
  switch (status) {
    case 'paid':
    case 'completed':
      return '#2F7132'
    case 'cancelled':
      return '#C04545'
    default:
      return '#B97512'
  }
}

function itemMatchesTab(item: ActivityItem, tab: TabKey): boolean {
  if (item.status === 'cancelled') return tab === 'cancelled'
  const dateObj = new Date(item.date)
  const now = new Date()
  if (tab === 'completed') return item.status === 'completed' || (item.status === 'paid' && dateObj < now)
  if (tab === 'upcoming') return item.status !== 'completed' && (dateObj >= now || item.status === 'payment_pending' || item.status === 'paid')
  return false
}

// ─── Activity Card ────────────────────────────────────────────────────────────
function ActivityCard({ item, onPress }: { item: ActivityItem; onPress: (item: ActivityItem) => void }) {
  const sColor = statusColor(item.status)
  const iconName = item.category === 'annadan' ? 'restaurant' : item.category === 'yajman' ? 'self-improvement' : 'directions-bus'
  const iconColor = item.category === 'annadan' ? '#E65C00' : item.category === 'yajman' ? '#B97512' : '#2F7132'

  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.cardLeft}>
        <View style={[styles.cardIcon, { backgroundColor: `${iconColor}18` }]}>
          <MaterialIcons name={iconName as any} size={22} color={iconColor} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.cardStatus, { backgroundColor: `${sColor}14` }]}>
            <Text style={[styles.cardStatusText, { color: sColor }]}>
              {item.status === 'paid' ? 'Confirmed' : item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDate}>
          <MaterialIcons name="event" size={12} color="#9E9080" /> {formatDate(item.date)} · {item.subtitle}
        </Text>
        <Text style={styles.cardRef}>{item.reference}</Text>
        <View style={styles.cardFooterRow}>
          <Text style={styles.cardAmount}>{formatAmount(item.amount)}</Text>
          <View style={styles.cardViewHint}>
            <MaterialIcons name={item.category === 'travel' ? 'visibility' : 'receipt-long'} size={13} color="#8B5A00" />
            <Text style={styles.cardViewText}>{item.category === 'travel' ? 'View Booking' : 'View Receipt'}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MySevasRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  const [sevaHistory, setSevaHistory] = useState<SevaBooking[]>([])
  const [travelBookings, setTravelBookings] = useState<Booking[]>([])
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all')
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming')
  const [selectedBooking, setSelectedBooking] = useState<SevaBooking | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  useProtectedRoute()

  useEffect(() => {
    Promise.all([getBookingsByUser(), fetchSevaHistory()])
      .then(([tb, sh]) => {
        setTravelBookings(tb)
        setSevaHistory(sh)
      })
      .catch(() => {})
      .finally(() => setIsLoadingData(false))
  }, [])

  if (!isHydrated || !user) return null

  // Build unified items
  const allItems: ActivityItem[] = [
    ...sevaHistory.map((b): ActivityItem => ({
      id: b.id,
      category: b.sevaType,
      title: SEVA_LABELS[b.sevaType].title,
      subtitle: SEVA_LABELS[b.sevaType].subtitle,
      date: b.sevaDate,
      reference: b.bookingReference,
      amount: b.totalAmount,
      status: b.status,
      rawSeva: b,
    })),
    ...travelBookings.map((tb): ActivityItem => ({
      id: tb.id,
      category: 'travel',
      title: 'Yatra Travel Package',
      subtitle: `${tb.travelerCount} Traveler(s)`,
      date: tb.createdAt || new Date().toISOString(),
      reference: tb.bookingReference,
      amount: tb.totalAmount,
      status: tb.status,
      rawTravel: tb,
    })),
  ]

  const filtered = allItems.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false
    return itemMatchesTab(item, activeTab)
  })

  const onItemPress = (item: ActivityItem) => {
    if (item.rawSeva) {
      setSelectedBooking(item.rawSeva)
    } else if (item.rawTravel) {
      router.push(`/(tabs)/travel/booking/${item.id}` as never)
    }
  }

  const onShare = async (booking: SevaBooking) => {
    const label = SEVA_LABELS[booking.sevaType]
    try {
      await Share.share({
        title: `${label.title} Receipt — Shri Gurudev Ashram`,
        message:
          `🙏 ${label.title} Receipt\n\n` +
          `Devotee: ${booking.fullName}\n` +
          `Seva Date: ${formatDate(booking.sevaDate)}\n` +
          `Amount: ${formatAmount(booking.totalAmount)}\n` +
          `Reference: ${booking.bookingReference}\n\n` +
          `Issued by Shri Gurudev Ashram\n` +
          `Jai Shri Gurudev! 🙏`,
      })
    } catch { /* user cancelled */ }
  }

  // Tab counts based on current category
  const categoryItems = activeCategory === 'all' ? allItems : allItems.filter((i) => i.category === activeCategory)
  const counts: Record<TabKey, number> = {
    upcoming: categoryItems.filter((i) => itemMatchesTab(i, 'upcoming')).length,
    completed: categoryItems.filter((i) => itemMatchesTab(i, 'completed')).length,
    cancelled: categoryItems.filter((i) => itemMatchesTab(i, 'cancelled')).length,
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <View>
            <Text style={styles.kicker}>Ashram Dashboard</Text>
            <Text style={styles.title}>My Activity</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{allItems.length}</Text>
          </View>
        </View>

        {/* Category filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStrip}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catChip, activeCategory === cat.key && styles.catChipActive]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={[styles.catText, activeCategory === cat.key && styles.catTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab strip */}
        <View style={styles.tabStrip}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {counts[tab.key] > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                    {counts[tab.key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading indicator for travel bookings */}
        {isLoadingData && activeCategory !== 'annadan' && activeCategory !== 'yajman' ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#8B5A00" />
            <Text style={styles.loadingText}>Loading travel bookings…</Text>
          </View>
        ) : null}

        {/* Content */}
        {filtered.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="volunteer-activism" size={40} color="#D8C9B8" />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab} records</Text>
            <Text style={styles.emptyBody}>
              {activeTab === 'upcoming'
                ? 'You have no upcoming activity. Book a Seva or Yatra package to begin.'
                : activeTab === 'completed'
                ? 'Your completed bookings and sevas will appear here.'
                : 'No cancelled records found.'}
            </Text>
            {activeTab === 'upcoming' && (
              <Pressable onPress={() => router.push('/(tabs)/home' as never)}>
                <LinearGradient
                  colors={['#7B4B00', '#B97512', '#E0A31F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>Explore Ashram Sevas</Text>
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
        ) : (
          <View style={styles.list}>
            {filtered.map((item, i) => (
              <Animated.View key={`${item.category}-${item.id}`} entering={FadeInDown.delay(i * 60).duration(400)}>
                <ActivityCard item={item} onPress={onItemPress} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Receipt Modal */}
      <Modal
        visible={!!selectedBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBooking(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedBooking(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Seva Receipt</Text>

            {selectedBooking && (
              <>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <SevaReceipt
                    data={{
                      receiptNumber: selectedBooking.bookingReference,
                      transactionDate: selectedBooking.createdAt,
                      sevaType: selectedBooking.sevaType,
                      sevaDate: selectedBooking.sevaDate,
                      devotee: selectedBooking.fullName,
                      phone: selectedBooking.phoneNumber,
                      amount: selectedBooking.totalAmount,
                      paymentMethod: 'UPI / Online',
                      status: selectedBooking.status,
                      referenceNumber: selectedBooking.bookingReference,
                    }}
                  />
                </ScrollView>

                {/* Modal actions */}
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalAction, { flex: 1 }]}
                    onPress={() => void onShare(selectedBooking)}
                  >
                    <MaterialIcons name="share" size={18} color="#8B5A00" />
                    <Text style={styles.modalActionText}>Share</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalAction, { flex: 1 }]}
                    onPress={() => setSelectedBooking(null)}
                  >
                    <LinearGradient
                      colors={['#7B4B00', '#B97512', '#E0A31F']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalClosePrimary}
                    >
                      <Text style={styles.modalClosePrimaryText}>Done</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 56, gap: 18 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F0E7DD',
  },
  kicker: { color: '#E65C00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2B231B', fontSize: 26, fontWeight: '900', marginTop: 2, flex: 1 },
  countBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#8B5A00', alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { color: '#8B5A00', fontSize: 13, fontWeight: '600' },

  // Category strip
  catStrip: { gap: 8, paddingBottom: 2 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8D5BE',
  },
  catChipActive: { backgroundColor: '#8B5A00', borderColor: '#8B5A00' },
  catText: { color: '#7E7162', fontSize: 13, fontWeight: '700' },
  catTextActive: { color: '#fff', fontWeight: '900' },

  // Tab strip
  tabStrip: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, padding: 4,
    borderWidth: 1, borderColor: '#F0E7DD',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
  },
  tabActive: { backgroundColor: '#8B5A00' },
  tabText: { color: '#7E7162', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff', fontWeight: '900' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#F0E7DD', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { color: '#8B5A00', fontSize: 10, fontWeight: '900' },
  tabBadgeTextActive: { color: '#fff' },

  // List
  list: { gap: 12 },

  // Card
  card: {
    flexDirection: 'row', gap: 14,
    backgroundColor: '#fff', borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: '#F0E7DD',
    shadowColor: '#5B4636', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardLeft: {},
  cardIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: '#2B231B', fontSize: 16, fontWeight: '900' },
  cardStatus: {
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  cardStatusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardDate: { color: '#9E9080', fontSize: 13, fontWeight: '600' },
  cardRef: { color: '#C4BAB0', fontSize: 11, fontWeight: '700' },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  cardAmount: { color: '#2B231B', fontSize: 17, fontWeight: '900' },
  cardViewHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardViewText: { color: '#8B5A00', fontSize: 12, fontWeight: '700' },

  // Empty state
  emptyState: {
    alignItems: 'center', gap: 12, paddingVertical: 40, paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F5EDE4', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: '#2B231B', fontSize: 18, fontWeight: '900' },
  emptyBody: { color: '#9E9080', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  emptyBtn: { minHeight: 50, borderRadius: 999, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(32,19,9,0.52)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FAF6F0', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 20, paddingBottom: 36, gap: 16, maxHeight: '92%',
  },
  modalHandle: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: '#E8D5BE',
    alignSelf: 'center', marginBottom: 4,
  },
  modalTitle: { color: '#2B231B', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalAction: {
    borderRadius: 999, borderWidth: 1.5, borderColor: '#E8D5BE',
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, minHeight: 50,
  },
  modalActionText: { color: '#8B5A00', fontSize: 14, fontWeight: '800' },
  modalClosePrimary: { minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, width: '100%' },
  modalClosePrimaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
})
