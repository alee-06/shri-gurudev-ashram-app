import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/useAuthStore'
import { refreshCurrentUser } from '../src/services/auth'
import { submitVerification, uploadAadhaar, uploadSelfie } from '../src/services/verification'
import { getFriendlyApiError } from '../src/utils/apiErrors'
import { isValidAadhaarNumber, normalizeDigits } from '../src/utils/validation'
import AppInput from '../src/components/AppInput'
import ImageUploadWidget from '../src/components/ImageUploadWidget'

type VerificationFormErrors = {
  aadhaarNumber?: string
  aadhaarImage?: string
  selfieImage?: string
}

export default function VerifyIdentityRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()

  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const aadhaarNumber = useAuthStore((state) => state.aadhaarNumber)
  const setAadhaarNumber = useAuthStore((state) => state.setAadhaarNumber)
  const temporaryAadhaarUri = useAuthStore((state) => state.temporaryAadhaarUri)
  const setTemporaryAadhaarUri = useAuthStore((state) => state.setTemporaryAadhaarUri)
  const temporarySelfieUri = useAuthStore((state) => state.temporarySelfieUri)
  const setTemporarySelfieUri = useAuthStore((state) => state.setTemporarySelfieUri)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<VerificationFormErrors>({})

  const verificationStatus = user?.verificationStatus ?? 'not_submitted'
  const canSubmitForm = verificationStatus === 'not_submitted' || verificationStatus === 'rejected'
  const hasSubmittedState = verificationStatus === 'submitted' || verificationStatus === 'verified'

  useEffect(() => {
    void syncCurrentUser()
  }, [])

  useEffect(() => {
    if (user?.aadhaarNumber && !aadhaarNumber) {
      setAadhaarNumber(user.aadhaarNumber)
    }
  }, [aadhaarNumber, setAadhaarNumber, user?.aadhaarNumber])

  const syncCurrentUser = async () => {
    const currentUser = await refreshCurrentUser()

    if (currentUser) {
      setUser(currentUser)

      if (currentUser.aadhaarNumber) {
        setAadhaarNumber(currentUser.aadhaarNumber)
      }
    }

    return currentUser
  }

  const refreshStatus = async () => {
    setIsRefreshing(true)
    setErrorMessage('')

    try {
      await syncCurrentUser()
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, 'Could not refresh verification status.'))
    } finally {
      setIsRefreshing(false)
    }
  }

  const validateForm = () => {
    const nextErrors: VerificationFormErrors = {}

    if (!isValidAadhaarNumber(aadhaarNumber)) {
      nextErrors.aadhaarNumber = 'Aadhaar must be 12 digits.'
    }

    if (!temporaryAadhaarUri) {
      nextErrors.aadhaarImage = 'Aadhaar document image is required.'
    }

    if (!temporarySelfieUri) {
      nextErrors.selfieImage = 'Selfie photo is required.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    setErrorMessage('')

    if (!canSubmitForm) {
      return
    }

    if (!validateForm()) {
      setErrorMessage('Please fix the highlighted fields before submitting.')
      return
    }

    const currentUser = await refreshCurrentUser()

    if (currentUser?.verificationStatus && currentUser.verificationStatus !== 'not_submitted' && currentUser.verificationStatus !== 'rejected') {
      setUser(currentUser)
      router.replace((returnTo || '/(tabs)/profile') as never)
      return
    }

    setIsSubmitting(true)

    try {
      const aadhaarResponse = await uploadAadhaar(temporaryAadhaarUri as string)
      const selfieResponse = await uploadSelfie(temporarySelfieUri as string)

      await submitVerification({
        aadhaarNumber,
        aadhaarImagePath: aadhaarResponse.path,
        selfieImagePath: selfieResponse.path,
      })

      const refreshedUser = await refreshCurrentUser()

      if (refreshedUser) {
        setUser(refreshedUser)
      }

      setTemporaryAadhaarUri(null)
      setTemporarySelfieUri(null)
      setFieldErrors({})

      Alert.alert('Verification submitted', 'Your identity verification has been submitted and your profile has been updated.', [
        {
          text: 'Continue',
          onPress: () => router.replace((returnTo || '/(tabs)/profile') as never),
        },
      ])
    } catch (error) {
      const friendlyError = getFriendlyApiError(error, 'Verification submission failed. Please try again.', [
        { match: /already been submitted/i, message: 'Verification already submitted.' },
        { match: /aadhaarNumber must be exactly 12 numeric digits/i, message: 'Aadhaar must be 12 digits.' },
        { match: /verification/i, message: 'Verification could not be completed right now.' },
      ])

      if (friendlyError === 'Verification already submitted.') {
        const refreshedUser = await refreshCurrentUser()

        if (refreshedUser) {
          setUser(refreshedUser)
        }

        router.replace((returnTo || '/(tabs)/profile') as never)
        return
      }

      setErrorMessage(friendlyError)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (hasSubmittedState && !canSubmitForm) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refreshStatus()} />}
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
          showsVerticalScrollIndicator={false}
        >
          <Header onBack={() => router.back()} />
          <StatusCard verificationStatus={verificationStatus} />
          <Pressable style={styles.primaryButton} onPress={() => router.replace((returnTo || '/(tabs)/profile') as never)}>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refreshStatus()} />}
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Header onBack={() => router.back()} disabled={isSubmitting} />

          {verificationStatus === 'rejected' ? <StatusCard verificationStatus={verificationStatus} /> : null}

          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={20} color="#E65C00" />
            <Text style={styles.infoText}>
              Verify your identity by uploading your Aadhaar document and a selfie. This is required before you can create a booking.
            </Text>
          </View>

          <View style={styles.card}>
            <AppInput
              label="Aadhaar Number"
              value={formatAadhaar(aadhaarNumber)}
              onChangeText={(value: string) => {
                setAadhaarNumber(value.replace(/\D/g, '').slice(0, 12))
                if (fieldErrors.aadhaarNumber) setFieldErrors({})
              }}
              placeholder="Enter 12-digit Aadhaar number"
              keyboardType="number-pad"
              errorMessage={fieldErrors.aadhaarNumber}
              editable={!isSubmitting}
              maxLength={14} // 12 digits + 2 spaces
            />
            <Text style={styles.hint}>{aadhaarNumber.length}/12 digits</Text>
          </View>

        <ImageUploadWidget
          title="Aadhaar document"
          label={temporaryAadhaarUri ? 'Aadhaar image selected' : 'No file selected'}
          uri={temporaryAadhaarUri}
          errorMessage={fieldErrors.aadhaarImage}
          onSelect={setTemporaryAadhaarUri}
          disabled={!canSubmitForm || isSubmitting}
        />
        <ImageUploadWidget
          title="Selfie photo"
          label={temporarySelfieUri ? 'Selfie selected' : 'No file selected'}
          uri={temporarySelfieUri}
          errorMessage={fieldErrors.selfieImage}
          onSelect={setTemporarySelfieUri}
          disabled={!canSubmitForm || isSubmitting}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[styles.primaryButton, (!canSubmitForm || isSubmitting) && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmitForm || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.primaryButtonText}>Submitting...</Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryButtonText}>{verificationStatus === 'rejected' ? 'Resubmit Verification' : 'Submit Verification'}</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}



function Header({ onBack, disabled }: { onBack: () => void, disabled?: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack} disabled={disabled}>
        <MaterialIcons name="arrow-back" size={24} color="#8B5A00" />
      </Pressable>
      <View>
        <Text style={styles.kicker}>User verification</Text>
        <Text style={styles.title}>Upload documents</Text>
      </View>
    </View>
  )
}

function StatusCard({ verificationStatus }: { verificationStatus: 'not_submitted' | 'submitted' | 'verified' | 'rejected' }) {
  const tone =
    verificationStatus === 'verified'
      ? { icon: 'verified', color: '#2E7D32', title: 'Identity Verified', subtitle: 'Your identity is verified and bookings are available.' }
      : verificationStatus === 'submitted'
        ? { icon: 'schedule', color: '#B97512', title: 'Verification Submitted', subtitle: 'Your verification is under review. You can continue once the status updates.' }
        : verificationStatus === 'rejected'
          ? { icon: 'cancel', color: '#C62828', title: 'Verification Rejected', subtitle: 'Your submission was rejected. Please correct the details and resubmit.' }
          : { icon: 'person-outline', color: '#7E7162', title: 'Verification not submitted', subtitle: 'Upload Aadhaar and selfie to unlock bookings.' }

  return (
    <View style={styles.statusCard}>
      <MaterialIcons name={tone.icon as any} size={22} color={tone.color} />
      <View style={styles.verifyCopy}>
        <Text style={[styles.verifyTitle, { color: tone.color }]}>{tone.title}</Text>
        <Text style={styles.verifySubtitle}>{tone.subtitle}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 48, gap: 16 },
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
  infoCard: { flexDirection: 'row', gap: 10, borderRadius: 18, backgroundColor: '#FFF8ED', padding: 14, borderWidth: 1, borderColor: '#FFE0B3' },
  infoText: { color: '#7E5C00', fontSize: 13, lineHeight: 20, flex: 1 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: '#FFF8ED', padding: 16, borderWidth: 1, borderColor: '#FFE0B3' },
  card: { borderRadius: 24, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#F0E7DD', gap: 8 },
  inputLabel: { color: '#2B231B', fontSize: 13, fontWeight: '900' },
  input: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F0E7DD',
    backgroundColor: '#FCFAF6',
    color: '#2B231B',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  inputError: { borderColor: '#D32F2F', backgroundColor: '#FFF8F8' },
  hint: { color: '#9E9080', fontSize: 12, fontWeight: '700' },
  fieldError: { color: '#D32F2F', fontSize: 12, fontWeight: '700', marginTop: 4 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: '#E65C00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  errorText: { color: '#D32F2F', fontSize: 13, fontWeight: '700' },
  verifyCopy: { flex: 1, gap: 4 },
  verifyTitle: { fontSize: 16, fontWeight: '900' },
  verifySubtitle: { fontSize: 13, color: '#7E7162', lineHeight: 18 },
})