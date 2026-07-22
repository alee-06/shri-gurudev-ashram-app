import React from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import RazorpayCheckout from 'react-native-razorpay'
import { SEVA_LABELS } from '../../src/constants/seva'
import type { SevaType } from '../../src/constants/seva'
import { createSevaOrder, verifySevaPayment } from '../../src/services/seva'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useSevaStore } from '../../src/store/useSevaStore'

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL SEVA PAYMENT SCREEN
// Params: sevaType, sevaBookingId, amount, reference, transactionId, sevaDate, devotee
// ─────────────────────────────────────────────────────────────────────────────
export default function SevaPaymentRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const {
    sevaType,
    sevaBookingId,
    amount,
    reference,
    transactionId,
    sevaDate,
    devotee,
    phone,
  } = useLocalSearchParams<{
    sevaType: string
    sevaBookingId: string
    amount: string
    reference: string
    transactionId: string
    sevaDate: string
    devotee: string
    phone: string
  }>()

  const [isPaying, setIsPaying] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const currentUser = useAuthStore((s) => s.user)

  const type = (sevaType as SevaType) ?? 'annadan'
  const label = SEVA_LABELS[type] ?? SEVA_LABELS.annadan
  const displayAmount = Number(amount || 0)

  const startPayment = async () => {
    if (!sevaBookingId) {
      setErrorMessage('Booking details are missing. Please go back and try again.')
      return
    }

    const key = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID

    if (!key) {
      setErrorMessage('Razorpay key is not configured.')
      return
    }

    setIsPaying(true)
    setErrorMessage('')

    try {
      const { order } = await createSevaOrder(sevaBookingId)

      const checkoutResult = await RazorpayCheckout.open({
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'Shri Gurudev Ashram',
        description: `Seva: ${label}`,
        order_id: order.id,
        prefill: {
          name: currentUser?.fullName ?? devotee,
          email: currentUser?.email ?? undefined,
          contact: currentUser?.phone ?? phone,
        },
        theme: {
          color: '#E65C00',
        },
      })

      await verifySevaPayment({
        bookingId: sevaBookingId,
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      })

      router.replace({
        pathname: '/(tabs)/seva-success',
        params: {
          sevaType: type,
          reference: reference ?? '',
          transactionId: checkoutResult.razorpay_payment_id,
          devotee: devotee ?? '',
          phone: phone ?? '',
          sevaDate: sevaDate ?? '',
          amount: String(displayAmount),
        },
      } as never)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Payment could not be completed. Please try again.',
      )
    } finally {
      setIsPaying(false)
    }
  }

  const formattedDate = sevaDate
    ? new Date(sevaDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} disabled={isPaying} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <View>
            <Text style={styles.kicker}>{label.subtitle}</Text>
            <Text style={styles.title}>Complete Seva</Text>
          </View>
        </View>

        {/* Seva Info Card */}
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: `${label.color}18` }]}>
            <MaterialIcons name={label.icon as any} size={34} color={label.color} />
          </View>

          <Text style={styles.sevaTitle}>{label.title}</Text>
          <Text style={styles.sevaDate}>{formattedDate}</Text>

          {devotee ? (
            <View style={styles.devoteePill}>
              <MaterialIcons name="person" size={14} color="#8B5A00" />
              <Text style={styles.devoteeText}>{devotee}</Text>
            </View>
          ) : null}

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Donation Amount</Text>
            <Text style={styles.amountValue}>₹{displayAmount.toLocaleString('en-IN')}</Text>
          </View>

          <Text style={styles.reference}>{reference}</Text>
        </View>

        {/* Info Note */}
        <View style={styles.noteBox}>
          <MaterialIcons name="info-outline" size={16} color="#8B5A00" />
          <Text style={styles.noteText}>
            Your seva will be confirmed immediately after payment. A receipt will be generated for your records.
          </Text>
        </View>


        {/* Error / Failure Workflow UI */}
        {errorMessage ? (
          <View style={styles.failureBox}>
            <View style={styles.failureHeader}>
              <MaterialIcons name="error-outline" size={22} color="#C04545" />
              <Text style={styles.failureTitle}>Payment Failed</Text>
            </View>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <View style={styles.failureActions}>
              <Pressable style={styles.retryBtn} onPress={() => void startPayment()}>
                <Text style={styles.retryBtnText}>↻ Retry Payment</Text>
              </Pressable>
              <Pressable
                style={styles.resumeBtn}
                onPress={() => {
                  router.push('/(tabs)/my-sevas' as never)
                }}
              >
                <Text style={styles.resumeBtnText}>Resume Later</Text>
              </Pressable>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  if (sevaBookingId) {
                    useSevaStore.getState().updateBookingStatus(sevaBookingId, 'cancelled')
                  }
                  router.replace('/(tabs)/home' as never)
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Pay Button */}
        <Pressable disabled={isPaying} onPress={() => void startPayment()}>
          <LinearGradient
            colors={isPaying ? ['#B9B1A9', '#B9B1A9'] : ['#7B4B00', '#B97512', '#E0A31F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            {isPaying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Confirm Seva · ₹{displayAmount.toLocaleString('en-IN')}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        <Text style={styles.disclaimer}>
          This seva is dedicated to Param Pujya Shri Swami Harichaitanyanand Saraswatiji Maharaj.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 56, gap: 18 },

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
  kicker: { color: '#E65C00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2B231B', fontSize: 26, fontWeight: '900', marginTop: 2 },

  card: {
    borderRadius: 30,
    backgroundColor: '#fff',
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0E7DD',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#5B4636',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevaTitle: { color: '#2B231B', fontSize: 20, fontWeight: '900' },
  sevaDate: { color: '#8B5A00', fontSize: 15, fontWeight: '700' },
  devoteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF0D9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  devoteeText: { color: '#8B5A00', fontSize: 13, fontWeight: '700' },
  amountRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  amountLabel: { color: '#9E9080', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  amountValue: { color: '#2B231B', fontSize: 38, fontWeight: '900', marginTop: 2 },
  reference: { color: '#B9B1A9', fontSize: 12, fontWeight: '700' },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF9F0',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0E7DD',
  },
  noteText: { color: '#7E7162', fontSize: 13, lineHeight: 20, flex: 1 },

  errorText: { color: '#D32F2F', fontSize: 13, fontWeight: '800', lineHeight: 20, textAlign: 'center' },

  simToggle: { alignSelf: 'center', paddingVertical: 4 },
  simToggleText: { color: '#8B5A00', fontSize: 12, fontWeight: '800' },

  failureBox: {
    backgroundColor: '#FFF2F2', borderRadius: 20, padding: 18, gap: 12,
    borderWidth: 1.5, borderColor: '#F8B4B4',
  },
  failureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  failureTitle: { color: '#C04545', fontSize: 16, fontWeight: '900' },
  failureActions: { gap: 8, marginTop: 4 },
  retryBtn: {
    backgroundColor: '#C04545', borderRadius: 999, minHeight: 46,
    alignItems: 'center', justifyContent: 'center',
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  resumeBtn: {
    backgroundColor: '#fff', borderRadius: 999, minHeight: 44,
    borderWidth: 1, borderColor: '#8B5A00', alignItems: 'center', justifyContent: 'center',
  },
  resumeBtnText: { color: '#8B5A00', fontSize: 14, fontWeight: '800' },
  cancelBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8,
  },
  cancelBtnText: { color: '#9E9080', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

  primaryButton: { minHeight: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  disclaimer: {
    color: '#B9B1A9',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
})
