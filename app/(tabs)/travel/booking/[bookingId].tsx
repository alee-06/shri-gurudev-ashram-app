import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ActivityIndicator } from 'react-native'
import { getBookingsByUser, getCurrentUser } from '../../../../src/services'
import { Booking } from '../../../../src/types/travel'

export default function BookingDetailsRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const [booking, setBooking] = React.useState<Booking | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState('')

  React.useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const currentUser = await getCurrentUser()

        if (!currentUser) {
          throw new Error('Please sign in to view booking details.')
        }

        const bookings = await getBookingsByUser(currentUser.id)
        const selectedBooking = bookings.find((item) => item.id === bookingId) ?? null

        if (isMounted) {
          setBooking(selectedBooking)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load booking details.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [bookingId])

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.loadingWrap, { paddingTop: Math.max(insets.top, 16) }]}>
          <ActivityIndicator color="#8B5A00" />
        </View>
      </SafeAreaView>
    )
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.emptyWrap, { paddingTop: Math.max(insets.top, 16) }]}>
          <MaterialIcons name="error-outline" size={34} color="#8B5A00" />
          <Text style={styles.emptyTitle}>Booking not found</Text>
          <Text style={styles.emptyText}>{errorMessage || 'We could not load this booking.'}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Booking details</Text>
            <Text style={styles.title}>{booking.bookingReference}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <MaterialIcons name="account-balance" size={38} color="#8B5A00" />
          <Text style={styles.packageName}>{booking.packageId}</Text>
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile label="Created" value={formatDate(booking.createdAt ?? '')} icon="event" />
          <SummaryTile label="Amount" value={`INR ${booking.totalAmount.toLocaleString('en-IN')}`} icon="payments" />
          <SummaryTile label="Reference" value={booking.bookingReference} icon="confirmation-number" />
          <SummaryTile label="Review" value="Admin verification" icon="verified-user" />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => router.push(`/(tabs)/travel/booking-status/${booking.id}` as never)}>
            <Text style={styles.primaryButtonText}>View Status</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.push(`/(tabs)/travel/upload-documents/${booking.id}` as never)}>
            <Text style={styles.secondaryButtonText}>Upload Documents</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function SummaryTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.summaryTile}>
      <MaterialIcons name={icon as any} size={20} color="#8B5A00" />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 48, gap: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E7DD',
  },
  headerCopy: { flex: 1 },
  kicker: { color: '#E65C00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2B231B', fontSize: 26, fontWeight: '900', marginTop: 2 },
  heroCard: {
    borderRadius: 30,
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E7DD',
    shadowColor: '#5B4636',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  packageName: { color: '#2B231B', fontSize: 22, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  statusText: { color: '#8B5A00', fontSize: 13, fontWeight: '900', marginTop: 8 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryTile: {
    width: '48%',
    borderRadius: 22,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#F0E7DD',
    padding: 16,
  },
  summaryLabel: { color: '#9E9080', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginTop: 12 },
  summaryValue: { color: '#2B231B', fontSize: 14, lineHeight: 20, fontWeight: '900', marginTop: 6 },
  actions: { gap: 12 },
  primaryButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: '#E65C00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#FFF0D9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E7DD',
  },
  secondaryButtonText: { color: '#993D00', fontSize: 15, fontWeight: '900' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 10 },
  emptyTitle: { color: '#2B231B', fontSize: 18, fontWeight: '900' },
  emptyText: { color: '#7E7162', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
})
