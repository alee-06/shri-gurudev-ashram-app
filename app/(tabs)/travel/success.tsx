import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useBookingDraftStore } from '../../../src/store/useBookingDraftStore'

export default function SuccessRoute() {
  const router = useRouter()
  const { bookingId, bookingReference } = useLocalSearchParams<{ bookingId?: string; bookingReference?: string }>()
  const resetDraft = useBookingDraftStore((state) => state.resetDraft)

  const draft = useBookingDraftStore()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <MaterialIcons name="check" size={42} color="#fff" />
        </View>
        <Text style={styles.kicker}>Booking submitted</Text>
        <Text style={styles.title}>Your yatra request has been created.</Text>
        <View style={styles.card}>
          <InfoRow label="Package" value={draft.selectedPackage?.title ?? 'Unknown Yatra'} />
          <InfoRow label="Travelers" value={draft.numberOfTravelers ?? '1'} />
          <InfoRow label="Payment Mode" value={draft.paymentMode ?? 'Pending'} />
          <InfoRow label="Booking Reference" value={bookingReference ?? 'Pending reference'} />
          <InfoRow label="Booking ID" value={bookingId ?? 'Created'} />
          <Text style={styles.note}>Your booking is pending admin verification. We will update the status after review.</Text>
        </View>

        <Pressable
          onPress={() => {
            resetDraft()
            router.replace('/(tabs)/home' as never)
          }}
        >
          <LinearGradient colors={['#7B4B00', '#B97512', '#E0A31F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 18 },
  successIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#E65C00',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#E65C00',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  kicker: { color: '#E65C00', textAlign: 'center', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3 },
  title: { color: '#2B231B', textAlign: 'center', fontSize: 28, lineHeight: 34, fontWeight: '900' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0E7DD',
    gap: 14,
  },
  infoRow: { borderBottomWidth: 1, borderBottomColor: '#F5EDE4', paddingBottom: 12 },
  infoLabel: { color: '#9E9080', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#2B231B', fontSize: 18, fontWeight: '900', marginTop: 6 },
  note: { color: '#7E7162', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  primaryButton: { minHeight: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
})
