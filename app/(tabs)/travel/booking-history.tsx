import React from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { getBookingsByUser } from '../../../src/services'
import { Booking, BookingStatus } from '../../../src/types/travel'
import { useProtectedRoute } from '../../../src/hooks/useProtectedRoute'

export default function BookingHistoryRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const isFetchingRef = React.useRef(false)
  useProtectedRoute()

  const loadBookings = React.useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true

    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setErrorMessage(null)

    try {
      const bookingData = await getBookingsByUser()
      setBookings(bookingData)
    } catch {
      setErrorMessage('We could not load your bookings right now. Please try again.')
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  React.useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const renderBookingCard = React.useCallback(({ item }: { item: Booking }) => {
    const bookingStatusTone = getBookingStatusTone(item.status)

    return (
      <Pressable style={styles.card} onPress={() => router.push(`/(tabs)/travel/booking/${item.id}` as never)}>
        <View style={styles.cardTop}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="event-note" size={22} color="#8B5A00" />
          </View>
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>{item.packageTitle || 'Yatra'}</Text>
            <Text style={styles.cardMeta}>{formatTravelDateRange(item.travelStartDate, item.travelEndDate)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: bookingStatusTone.background }]}>
            <Text style={[styles.statusText, { color: bookingStatusTone.color }]}>{bookingStatusTone.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View>
            <Text style={styles.cardLabel}>Booking Ref:</Text>
            <Text style={styles.reference}>{item.bookingReference}</Text>
          </View>
          <Text style={styles.tripMeta}>{formatTravelerCount(item.travelerCount)} • {formatAmount(item.totalAmount)}</Text>
        </View>
      </Pressable>
    )
  }, [router])

  if (isLoading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.loadingState, { paddingTop: Math.max(insets.top, 16) }]}>
          <Header onBack={() => router.back()} />
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#8B5A00" />
            <Text style={styles.loaderText}>Loading your bookings</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (errorMessage && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}>
          <Header onBack={() => router.back()} />
          <View style={styles.errorState}>
            <MaterialIcons name="error-outline" size={30} color="#8B5A00" />
            <Text style={styles.errorTitle}>We could not load your bookings</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadBookings()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        refreshing={isRefreshing}
        onRefresh={() => {
          void loadBookings(true)
        }}
        ListHeaderComponent={
          <View>
            <Header onBack={() => router.back()} />
            {errorMessage ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{errorMessage}</Text>
                <Pressable style={styles.inlineRetryButton} onPress={() => void loadBookings()}>
                  <Text style={styles.inlineRetryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="event-available" size={34} color="#8B5A00" />
            <Text style={styles.emptyTitle}>Your bookings will appear here</Text>
            <Text style={styles.emptyText}>Once a booking is created, it will show up here from Supabase.</Text>
          </View>
        }
        renderItem={renderBookingCard}
      />
    </SafeAreaView>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
      </Pressable>
      <View>
        <Text style={styles.kicker}>Yatra records</Text>
        <Text style={styles.title}>Booking History</Text>
      </View>
    </View>
  )
}

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTravelDateRange(startDate?: string | null, endDate?: string | null) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)

  if (start && end) {
    return `${start} - ${end}`
  }

  return start || end
}

function formatTravelerCount(count: number) {
  return `${count} ${count === 1 ? 'Traveler' : 'Travelers'}`
}

function getBookingStatusTone(status: BookingStatus): { label: string; background: string; color: string } {
  if (status === 'paid') {
    return { label: 'Paid', background: '#EAF7EA', color: '#2E7D32' }
  }

  if (status === 'payment_pending') {
    return { label: 'Payment Pending', background: '#FFF8ED', color: '#B97512' }
  }

  return { label: formatStatusLabel(status), background: '#F1F2F4', color: '#667085' }
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F3EA' },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 14, flexGrow: 1 },
  loadingState: { flex: 1, paddingHorizontal: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
  },
  kicker: { color: '#8B5A00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2C1D10', fontSize: 28, fontWeight: '900', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    shadowColor: '#2D1A0C',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7EFE4', alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { color: '#2C1D10', fontSize: 16, fontWeight: '900' },
  cardMeta: { color: '#7E7162', fontSize: 13, marginTop: 4, fontWeight: '600' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontSize: 11, fontWeight: '900' },
  divider: { height: 1, backgroundColor: 'rgba(139,90,0,0.08)', marginVertical: 14 },
  cardBody: { gap: 10 },
  cardLabel: { color: '#A08D77', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  reference: { color: '#7E7162', fontSize: 13, fontWeight: '800', marginTop: 3 },
  tripMeta: { color: '#8B5A00', fontSize: 15, fontWeight: '900' },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    minHeight: 200,
    gap: 8,
    marginTop: 12,
  },
  emptyTitle: { color: '#2C1D10', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: '#7E7162', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
  loaderCard: {
    backgroundColor: '#FFF',
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    gap: 12,
    marginTop: 12,
    minHeight: 200,
  },
  loaderText: { color: '#7E7162', fontSize: 14, fontWeight: '700' },
  errorState: {
    backgroundColor: '#FFF',
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    gap: 10,
    marginTop: 12,
    minHeight: 220,
  },
  errorTitle: { color: '#2C1D10', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  errorText: { color: '#7E7162', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
  retryButton: { marginTop: 4, backgroundColor: '#FFF0D9', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  retryButtonText: { color: '#8B5A00', fontSize: 13, fontWeight: '900' },
  inlineError: {
    backgroundColor: '#FFF7EB',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    gap: 10,
    marginBottom: 4,
  },
  inlineErrorText: { color: '#7E7162', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  inlineRetryButton: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  inlineRetryText: { color: '#8B5A00', fontSize: 12, fontWeight: '900' },
})
