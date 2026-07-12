import React from 'react'
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { getBookingById } from '../../../src/services'
import TravelReceipt, { type TravelReceiptData } from '../../../src/components/TravelReceipt'
import type { Booking } from '../../../src/types/travel'

export default function SuccessRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { bookingId, bookingReference } = useLocalSearchParams<{ bookingId?: string; bookingReference?: string }>()

  const [booking, setBooking] = React.useState<Booking | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!bookingId) {
      setIsLoading(false)
      return
    }
    getBookingById(bookingId)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setIsLoading(false))
  }, [bookingId])

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
    const ref = booking.bookingReference ?? bookingReference ?? '—'
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
          `Amount Paid: ₹${amount}\n\n` +
          `Issued by Shri Gurudev Ashram\n` +
          `Palaskhed Sapkal, Dist. Buldhana, MH\n` +
          `Contact: +91 91587 40007\n\n` +
          `Jai Shri Gurudev! 🙏`,
      })
    } catch {
      // user cancelled share — no-op
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <View style={styles.successIconWrap}>
          <LinearGradient
            colors={['#7B4B00', '#B97512', '#E0A31F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successGradient}
          >
            <MaterialIcons name="check" size={42} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.kicker}>Payment successful</Text>
        <Text style={styles.title}>Your yatra booking is confirmed!</Text>
        <Text style={styles.subtitle}>
          Your payment was verified and your seat count has been secured. Safe travels and Jai Shri Gurudev!
        </Text>

        {/* Receipt or skeleton */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#8B5A00" />
            <Text style={styles.loadingText}>Loading receipt…</Text>
          </View>
        ) : receiptData ? (
          <TravelReceipt data={receiptData} />
        ) : (
          // Fallback when booking fetch fails — still show basic info
          <View style={styles.fallbackCard}>
            <MaterialIcons name="confirmation-number" size={28} color="#8B5A00" />
            <Text style={styles.fallbackRef}>{bookingReference ?? 'Booking confirmed'}</Text>
            <Text style={styles.fallbackNote}>
              Booking ID: {bookingId ?? '—'}
            </Text>
          </View>
        )}

        {/* Primary CTA */}
        <Pressable onPress={() => router.push('/(tabs)/travel/booking-history' as never)}>
          <LinearGradient
            colors={['#7B4B00', '#B97512', '#E0A31F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>View My Bookings →</Text>
          </LinearGradient>
        </Pressable>

        {/* Secondary actions */}
        <View style={styles.secondaryRow}>
          <Pressable
            style={[styles.secondaryButton, { flex: 1 }]}
            onPress={() => void shareReceipt()}
          >
            <MaterialIcons name="share" size={18} color="#8B5A00" />
            <Text style={styles.secondaryButtonText}>Share Receipt</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { flex: 1 }]}
            onPress={() => router.replace('/(tabs)/home' as never)}
          >
            <MaterialIcons name="home" size={18} color="#8B5A00" />
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 56, gap: 20, alignItems: 'stretch' },

  successIconWrap: {
    alignSelf: 'center',
    shadowColor: '#B97512', shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
    elevation: 8, marginTop: 8,
  },
  successGradient: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
  },

  kicker: { color: '#E65C00', textAlign: 'center', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: '#2B231B', textAlign: 'center', fontSize: 28, fontWeight: '900', lineHeight: 34 },
  subtitle: { color: '#7E7162', textAlign: 'center', fontSize: 14, lineHeight: 22, paddingHorizontal: 16 },

  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  loadingText: { color: '#9E9080', fontSize: 13, fontWeight: '600' },

  fallbackCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#F0E7DD',
  },
  fallbackRef: { color: '#2B231B', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  fallbackNote: { color: '#9E9080', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  primaryButton: { minHeight: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  secondaryRow: { flexDirection: 'row', gap: 12 },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 50, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#E8D5BE', backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#8B5A00', fontSize: 14, fontWeight: '800' },
})
