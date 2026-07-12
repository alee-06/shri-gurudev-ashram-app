import React from 'react'
import { Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ActivityIndicator } from 'react-native'
import { getBookingById } from '../../../../src/services'
import TravelReceipt, { type TravelReceiptData } from '../../../../src/components/TravelReceipt'
import { Booking } from '../../../../src/types/travel'

export default function BookingDetailsRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const [booking, setBooking] = React.useState<Booking | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const [showReceipt, setShowReceipt] = React.useState(false)

  const loadBooking = React.useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setErrorMessage('')

    try {
      const selectedBooking = await getBookingById(bookingId)
      setBooking(selectedBooking)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load booking details.')
    } finally {
      if (refresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [bookingId])

  React.useEffect(() => {
    void loadBooking()
  }, [loadBooking])

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

  const isPaid = booking?.status === 'paid' || booking?.status === 'confirmed' || booking?.status === 'completed'

  const receiptData: TravelReceiptData | null = booking
    ? {
        bookingReference: booking.bookingReference,
        bookingId: booking.id,
        packageTitle: booking.packageTitle ?? booking.packageId,
        travelStartDate: booking.travelStartDate,
        travelEndDate: booking.travelEndDate,
        travelerCount: booking.travelerCount,
        totalAmount: booking.totalAmount,
        status: booking.status,
        fullName: booking.fullName,
        phoneNumber: booking.phoneNumber,
        createdAt: booking.createdAt,
        transportType: booking.transportType,
        roomType: booking.roomType,
      }
    : null

  const shareReceipt = async () => {
    if (!booking) return
    const ref = booking.bookingReference
    const amount = booking.totalAmount.toLocaleString('en-IN')
    const departure = booking.travelStartDate
      ? new Date(booking.travelStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'
    try {
      await Share.share({
        title: `Yatra Booking Receipt — Shri Gurudev Ashram`,
        message:
          `🙏 Yatra Booking Confirmed!\n\n` +
          `Package: ${booking.packageTitle ?? booking.packageId}\n` +
          `Booking Ref: ${ref}\n` +
          `Departure: ${departure}\n` +
          `Travelers: ${booking.travelerCount}\n` +
          `Amount: ₹${amount}\n\n` +
          `Issued by Shri Gurudev Ashram\n` +
          `Jai Shri Gurudev! 🙏`,
      })
    } catch {
      // user cancelled — no-op
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadBooking(true)} />}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.statusText}>{formatStatus(booking.status)}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile label="Created" value={formatDate(booking.createdAt ?? '')} icon="event" />
          <SummaryTile label="Amount" value={`INR ${booking.totalAmount.toLocaleString('en-IN')}`} icon="payments" />
          <SummaryTile label="Reference" value={booking.bookingReference} icon="confirmation-number" />
          <SummaryTile label="Payment" value={formatStatus(booking.status)} icon="verified-user" />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => router.push(`/(tabs)/travel/booking-status/${booking.id}` as never)}>
            <Text style={styles.primaryButtonText}>View Status</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
          {isPaid && receiptData ? (
            <View style={styles.receiptRow}>
              <Pressable style={[styles.receiptButton, { flex: 1 }]} onPress={() => setShowReceipt(true)}>
                <MaterialIcons name="receipt-long" size={18} color="#8B5A00" />
                <Text style={styles.receiptButtonText}>View Receipt</Text>
              </Pressable>
              <Pressable style={[styles.receiptButton, { flex: 1 }]} onPress={() => void shareReceipt()}>
                <MaterialIcons name="share" size={18} color="#8B5A00" />
                <Text style={styles.receiptButtonText}>Share Receipt</Text>
              </Pressable>
            </View>
          ) : null}
          {booking.status === 'payment_pending' ? (
            <Pressable style={styles.secondaryButton} onPress={() => router.push(`/(tabs)/travel/payment?bookingId=${booking.id}&bookingReference=${booking.bookingReference}` as never)}>
              <Text style={styles.secondaryButtonText}>Pay Now</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Receipt Modal */}
      {receiptData ? (
        <Modal
          visible={showReceipt}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReceipt(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowReceipt(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Booking Receipt</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TravelReceipt data={receiptData} />
              </ScrollView>
              <Pressable style={styles.modalClose} onPress={() => setShowReceipt(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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

function formatStatus(status: Booking['status']) {
  return status.replace('_', ' ')
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

  // Receipt buttons
  receiptRow: { flexDirection: 'row', gap: 12 },
  receiptButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 50, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#E8D5BE', backgroundColor: '#fff',
  },
  receiptButtonText: { color: '#8B5A00', fontSize: 14, fontWeight: '800' },

  // Receipt modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(32,19,9,0.52)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAF6F0', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 20, paddingBottom: 36, gap: 16, maxHeight: '90%',
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  modalHandle: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: '#E8D5BE',
    alignSelf: 'center', marginBottom: 4,
  },
  modalTitle: { color: '#2B231B', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  modalClose: {
    minHeight: 50, borderRadius: 999, backgroundColor: '#E65C00',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  modalCloseText: { color: '#fff', fontSize: 15, fontWeight: '900' },
})
