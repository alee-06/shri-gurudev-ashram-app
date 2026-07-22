import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSevaStore } from '../../../../src/store/useSevaStore'
import { createSevaBooking, fetchSevaPricing } from '../../../../src/services/seva'

// ─────────────────────────────────────────────────────────────────────────────
export default function AnnadanReviewRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const fullName = useSevaStore((s) => s.fullName)
  const phoneNumber = useSevaStore((s) => s.phoneNumber)
  const selectedDate = useSevaStore((s) => s.selectedDate)
  const setBookingResult = useSevaStore((s) => s.setBookingResult)

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [annadanPrice, setAnnadanPrice] = useState(2100)

  React.useEffect(() => {
    fetchSevaPricing().then((p) => { if (p?.annadan) setAnnadanPrice(p.annadan) }).catch(() => {})
  }, [])

  const displayDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—'

  const onConfirmAndPay = async () => {
    setIsCreating(true)
    setError('')
    try {
      const booking = await createSevaBooking({
        sevaType: 'annadan',
        sevaDate: selectedDate,
        fullName,
        phoneNumber,
        totalAmount: annadanPrice,
      })
      setBookingResult(booking.id, booking.bookingReference, booking.transactionId)

      router.push({
        pathname: '/(tabs)/seva-payment',
        params: {
          sevaType: 'annadan',
          sevaBookingId: booking.id,
          amount: String(annadanPrice),
          reference: booking.bookingReference,
          transactionId: booking.transactionId ?? '',
          sevaDate: selectedDate,
          devotee: fullName,
          phone: phoneNumber,
        },
      } as never)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create booking. Please try again.')
    } finally {
      setIsCreating(false)
    }
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
            <Text style={styles.kicker}>Step 3 of 3</Text>
            <Text style={styles.title}>Review Booking</Text>
          </View>
        </View>

        {/* Summary card */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconWrap}>
              <MaterialIcons name="restaurant" size={28} color="#8B5A00" />
            </View>
            <View>
              <Text style={styles.summaryType}>Annadan Seva</Text>
              <Text style={styles.summarySubtype}>Mahaprasad Sponsorship</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <ReviewRow icon="event" label="Seva Date" value={displayDate} highlight />
          <ReviewRow icon="person" label="Devotee Name" value={fullName} />
          <ReviewRow icon="phone" label="Mobile Number" value={phoneNumber} />

          <View style={styles.divider} />

          {/* Amount */}
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Donation Amount</Text>
            <Text style={styles.amountValue}>₹{annadanPrice.toLocaleString('en-IN')}</Text>
            <Text style={styles.amountNote}>Fixed amount · One-time donation</Text>
          </View>
        </Animated.View>

        {/* Blessings note */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.blessingsCard}>
          <Text style={styles.blessingsText}>
            🙏 By sponsoring this Annadan, you are contributing to the nourishment of all devotees visiting the Ashram on{' '}
            <Text style={{ fontWeight: '900', color: '#8B5A00' }}>{displayDate}</Text>.
            May Guruji's blessings be with you.
          </Text>
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Confirm & Pay */}
        <Pressable disabled={isCreating} onPress={() => void onConfirmAndPay()}>
          <LinearGradient
            colors={isCreating ? ['#B9B1A9', '#B9B1A9'] : ['#7B4B00', '#B97512', '#E0A31F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaButton}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                Confirm & Proceed to Payment
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.editLink} onPress={() => router.back()}>
          <Text style={styles.editLinkText}>Edit Details</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Row helper ───────────────────────────────────────────────────────────────
function ReviewRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewIconWrap}>
        <MaterialIcons name={icon as any} size={16} color="#9E9080" />
      </View>
      <View style={styles.reviewText}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={[styles.reviewValue, highlight && styles.reviewValueHighlight]}>{value}</Text>
      </View>
    </View>
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
  title: { color: '#2B231B', fontSize: 26, fontWeight: '900', marginTop: 2 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 22,
    borderWidth: 1, borderColor: '#F0E7DD', gap: 14,
    shadowColor: '#5B4636', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center',
  },
  summaryType: { color: '#2B231B', fontSize: 18, fontWeight: '900' },
  summarySubtype: { color: '#9E9080', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F5EDE4' },

  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reviewIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FAF6F0', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  reviewText: { flex: 1, gap: 2 },
  reviewLabel: { color: '#9E9080', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  reviewValue: { color: '#2B231B', fontSize: 15, fontWeight: '700' },
  reviewValueHighlight: { color: '#8B5A00', fontWeight: '900' },

  amountBlock: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  amountLabel: { color: '#9E9080', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  amountValue: { color: '#2B231B', fontSize: 40, fontWeight: '900' },
  amountNote: { color: '#B9B1A9', fontSize: 12, fontWeight: '600' },

  blessingsCard: {
    backgroundColor: '#FFF9F0', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#EDD9B8',
  },
  blessingsText: { color: '#7E7162', fontSize: 14, lineHeight: 22, textAlign: 'center' },

  errorText: { color: '#C04545', fontSize: 13, fontWeight: '800', textAlign: 'center' },

  ctaButton: { minHeight: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  editLink: { alignItems: 'center', paddingVertical: 6 },
  editLinkText: { color: '#8B5A00', fontSize: 14, fontWeight: '700' },
})
