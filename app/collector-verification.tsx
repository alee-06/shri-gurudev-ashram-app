import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/useAuthStore'

const checklist = [
  { key: 'aadhaar', label: 'Aadhaar document uploaded', icon: 'badge' },
  { key: 'selfie', label: 'Selfie photo verified', icon: 'face' },
  { key: 'identityApproved', label: 'Identity documents approved', icon: 'check-circle' },
]

export default function CollectorVerificationRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const [verified, setVerified] = useState<Record<string, boolean>>({ aadhaar: true })

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
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <View>
            <Text style={styles.kicker}>Collector review</Text>
            <Text style={styles.title}>Verify booking</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.name}>Anjali Deshmukh</Text>
            <Text style={styles.meta}>BK-CR-2401 / Shri Kedarnath Darshan Yatra</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>Partial payment</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Verification checklist</Text>
          {checklist.map((item) => {
            const active = !!verified[item.key]
            return (
              <Pressable
                key={item.key}
                style={[styles.checkRow, active && styles.checkRowActive]}
                onPress={() => setVerified((current) => ({ ...current, [item.key]: !current[item.key] }))}
              >
                <View style={[styles.checkIcon, active && styles.checkIconActive]}>
                  <MaterialIcons name={active ? 'check' : (item.icon as any)} size={18} color={active ? '#fff' : '#8B5A00'} />
                </View>
                <Text style={[styles.checkLabel, active && styles.checkLabelActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking status</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Booking paid</Text>
            <Text style={styles.summaryValue}>INR 24,000</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>Partial payment</Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Save Review</Text>
          <MaterialIcons name="check" size={18} color="#fff" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F3EA' },
  content: { paddingHorizontal: 18, paddingBottom: 48, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)' },
  kicker: { color: '#8B5A00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2C1D10', fontSize: 30, fontWeight: '900', marginTop: 2 },
  heroCard: { flexDirection: 'row', gap: 14, backgroundColor: '#fff', borderRadius: 28, padding: 18, borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)' },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#8B5A00', fontSize: 24, fontWeight: '900' },
  heroCopy: { flex: 1 },
  name: { color: '#2C1D10', fontSize: 18, fontWeight: '900' },
  meta: { color: '#6B5A4A', fontSize: 13, lineHeight: 20, marginTop: 4 },
  statusPill: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#FFF0D9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { color: '#8B5A00', fontSize: 11, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 18, borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)', gap: 12 },
  sectionTitle: { color: '#2C1D10', fontSize: 20, fontWeight: '900' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: '#FCFAF6', padding: 14, borderWidth: 1, borderColor: '#F0E7DD' },
  checkRowActive: { backgroundColor: '#FFF9F0', borderColor: '#FF9933' },
  checkIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center' },
  checkIconActive: { backgroundColor: '#E65C00' },
  checkLabel: { flex: 1, color: '#6B5A4A', fontSize: 14, fontWeight: '800' },
  checkLabelActive: { color: '#993D00' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#7E7162', fontSize: 13, fontWeight: '800' },
  summaryValue: { color: '#2C1D10', fontSize: 16, fontWeight: '900' },
  progressTrack: { height: 8, backgroundColor: '#F0E7DD', borderRadius: 4, overflow: 'hidden' },
  progressFill: { width: '50%', height: '100%', backgroundColor: '#E65C00' },
  primaryButton: { minHeight: 58, borderRadius: 999, backgroundColor: '#E65C00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
})
