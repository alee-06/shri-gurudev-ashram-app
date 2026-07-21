import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { applyCollector, reapplyCollector, getCollectorStatus } from '../src/services/donation'
import { useAuthStore } from '../src/store/useAuthStore'
import AppInput from '../src/components/AppInput'
import ImageUploadWidget from '../src/components/ImageUploadWidget'
import { useProtectedRoute } from '../src/hooks/useProtectedRoute'

type CollectorStatus = { role: string; collectorId?: string; referralCode?: string; collectorProfile?: { fullName?: string; status?: string; rejectedReason?: string } | null }

export default function CollectorApplyRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  useProtectedRoute()
  
  const [status, setStatus] = useState<CollectorStatus | null>(null)
  
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [address, setAddress] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [aadharFront, setAadharFront] = useState<string | null>(null)
  const [aadharBack, setAadharBack] = useState<string | null>(null)
  
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; address?: string; panNumber?: string; aadharFront?: string; aadharBack?: string }>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadStatus = async () => { 
    try { 
      const result = await getCollectorStatus()
      setStatus(result.data ?? null) 
    } catch { 
      setStatus(null) 
    } finally { 
      setLoading(false) 
    } 
  }

  useEffect(() => { 
    if (isHydrated && user) void loadStatus() 
  }, [isHydrated, user])


  const validate = () => {
    const nextErrors: typeof fieldErrors = {}

    if (!fullName.trim()) nextErrors.fullName = 'Full name is required'
    if (!address.trim()) nextErrors.address = 'Address is required'
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber.trim().toUpperCase())) nextErrors.panNumber = 'Enter a valid PAN number'
    if (!aadharFront) nextErrors.aadharFront = 'Aadhaar front image is required'
    if (!aadharBack) nextErrors.aadharBack = 'Aadhaar back image is required'

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async () => {
    if (submitting) return
    if (!validate()) { 
      Alert.alert('Incomplete application', 'Please fix the highlighted fields before submitting.')
      return 
    }
    
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('fullName', fullName.trim())
      form.append('address', address.trim())
      form.append('panNumber', panNumber.trim().toUpperCase())
      form.append('aadharFront', { uri: aadharFront, type: 'image/jpeg', name: 'aadhar-front.jpg' } as any)
      form.append('aadharBack', { uri: aadharBack, type: 'image/jpeg', name: 'aadhar-back.jpg' } as any)
      
      if (status?.collectorProfile?.status === 'rejected') {
        await reapplyCollector(form)
      } else {
        await applyCollector(form)
      }
      
      await loadStatus()
      Alert.alert('Application submitted', 'Your collector application is now pending approval.')
    } catch (error) { 
      Alert.alert('Application failed', error instanceof Error ? error.message : 'Please try again.') 
    } finally { 
      setSubmitting(false) 
    }
  }

  if (!isHydrated || !user) return null
  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color="#8B5A00" /></SafeAreaView>
  
  const applicationStatus = status?.collectorProfile?.status
  
  if (status?.role === 'COLLECTOR_APPROVED' || applicationStatus === 'approved') {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialIcons name="verified" size={64} color="#3E8E41" />
        <Text style={styles.title}>Collector approved</Text>
        <Text style={styles.body}>
          Collector ID: {status?.collectorId ?? '—'}{status?.referralCode ? `\nReferral code: ${status.referralCode}` : ''}
        </Text>
        <Pressable onPress={() => router.replace('/collector-dashboard' as never)} style={styles.button}>
          <Text style={styles.buttonText}>Open Collector Dashboard</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  if (applicationStatus === 'pending') {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialIcons name="hourglass-top" size={64} color="#B97512" />
        <Text style={styles.title}>Application under review</Text>
        <Text style={styles.body}>Your documents were submitted. The ashram team must approve your application before your collector ID is activated.</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const isRejected = applicationStatus === 'rejected'

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()} disabled={submitting}>
              <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
            </Pressable>
            <View>
              {isRejected ? null : <Text style={styles.kicker}>Collector registration</Text>}
              <Text style={styles.title}>{isRejected ? 'Reapply for Collector' : 'Apply to become a collector'}</Text>
            </View>
          </View>

          {isRejected ? (
            <View style={styles.rejectedBanner}>
              <MaterialIcons name="error-outline" size={24} color="#D32F2F" />
              <View style={styles.rejectedCopy}>
                <Text style={styles.rejectedTitle}>Application Rejected</Text>
                <Text style={styles.rejectedText}>{status?.collectorProfile?.rejectedReason || 'Your application was rejected. Please review your details and reapply.'}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.body}>Submit your details and identity documents for ashram approval.</Text>
          )}

          <View style={styles.card}>
            <AppInput 
              label="Full name" 
              value={fullName} 
              onChangeText={(v) => { setFullName(v); if (fieldErrors.fullName) setFieldErrors(e => ({ ...e, fullName: undefined })) }} 
              errorMessage={fieldErrors.fullName}
              autoCapitalize="words"
              autoComplete="name"
              editable={!submitting}
            />
            <AppInput 
              label="Address" 
              value={address} 
              onChangeText={(v) => { setAddress(v); if (fieldErrors.address) setFieldErrors(e => ({ ...e, address: undefined })) }} 
              errorMessage={fieldErrors.address}
              autoCapitalize="words"
              autoComplete="street-address"
              editable={!submitting}
            />
            <AppInput 
              label="PAN Number" 
              value={panNumber} 
              onChangeText={(v) => { setPanNumber(v.toUpperCase()); if (fieldErrors.panNumber) setFieldErrors(e => ({ ...e, panNumber: undefined })) }} 
              errorMessage={fieldErrors.panNumber}
              autoCapitalize="characters"
              maxLength={10}
              editable={!submitting}
            />
          </View>

          <View style={styles.card}>
            <ImageUploadWidget
              title="Aadhaar front"
              label={aadharFront ? 'Image selected' : 'No file selected'}
              uri={aadharFront}
              errorMessage={fieldErrors.aadharFront}
              onSelect={setAadharFront}
              disabled={submitting}
            />
            <ImageUploadWidget
              title="Aadhaar back"
              label={aadharBack ? 'Image selected' : 'No file selected'}
              uri={aadharBack}
              errorMessage={fieldErrors.aadharBack}
              onSelect={setAadharBack}
              disabled={submitting}
            />
          </View>

          <Pressable disabled={submitting} onPress={() => void submit()} style={[styles.button, submitting && { opacity: 0.6 }]}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isRejected ? 'Submit Reapplication' : 'Submit Application'}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({ 
  container: { flex: 1, backgroundColor: '#FAF6F0' }, 
  content: { padding: 18, paddingBottom: 48, gap: 16 }, 
  center: { flex: 1, backgroundColor: '#FAF6F0', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }, 
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F0E7DD' },
  kicker: { color: '#E65C00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 }, 
  title: { color: '#2C1D10', fontSize: 26, fontWeight: '900', marginTop: 2 }, 
  body: { color: '#7E7162', fontSize: 14, lineHeight: 21 }, 
  
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#F0E7DD', gap: 12 },
  
  fieldError: { color: '#D32F2F', fontSize: 12, fontWeight: '700', marginTop: -4 },
  
  button: { minHeight: 56, borderRadius: 999, backgroundColor: '#E65C00', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, 
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' }, 
  
  rejectedBanner: { flexDirection: 'row', backgroundColor: '#FFEBEE', padding: 16, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: '#FFCDD2' }, 
  rejectedCopy: { flex: 1, gap: 4 }, 
  rejectedTitle: { color: '#D32F2F', fontSize: 14, fontWeight: '900' }, 
  rejectedText: { color: '#C62828', fontSize: 13, lineHeight: 18 } 
})
