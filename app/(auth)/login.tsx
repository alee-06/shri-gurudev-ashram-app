import React, { useRef, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/useAuthStore'
import { confirmPhoneOtp, requestPhoneOtp } from '../../src/services/auth'
import type { ConfirmationResult } from '@react-native-firebase/auth'
import { getFriendlyApiError } from '../../src/utils/apiErrors'
import { isValidPhoneNumber, normalizeDigits } from '../../src/utils/validation'
import AppInput from '../../src/components/AppInput'

export default function PhoneAuthRoute() {
  const router = useRouter()
  const params = useLocalSearchParams<{ returnTo?: string }>()
  const returnTo = params.returnTo

  const setUser = useAuthStore((state) => state.setUser)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; code?: string }>({})

  const codeInputRef = useRef<TextInput>(null)

  const validatePhone = () => {
    const nextErrors: typeof fieldErrors = {}
    if (!isValidPhoneNumber(phone)) { nextErrors.phone = 'Phone number must be 10 digits.' }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateCode = () => {
    const nextErrors: typeof fieldErrors = {}
    if (code.length < 6) { nextErrors.code = 'Please enter a valid 6-digit OTP.' }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleContinue = async () => {
    if (isSubmitting) return

    if (!confirmation) {
      if (!validatePhone()) return
    } else {
      if (!validateCode()) return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      if (!confirmation) {
        const result = await requestPhoneOtp(phone)
        setConfirmation(result)
        // Focus OTP field automatically on next render
        setTimeout(() => codeInputRef.current?.focus(), 100)
      } else {
        const user = await confirmPhoneOtp(confirmation, code)
        setUser(user)
        
        if (!user.fullName.trim()) {
          router.replace({ pathname: '/edit-profile', params: { onboarding: '1', returnTo } } as never)
        } else if (returnTo) {
          router.replace(returnTo as never)
        } else {
          router.replace('/(tabs)/home' as never)
        }
      }
    } catch (error) {
      setErrorMessage(getFriendlyApiError(error, 'Could not sign you in. Please try again.', [{ match: /invalid/i, message: 'Invalid OTP. Please check and try again.' }]))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
            </Pressable>
            <View style={styles.iconWrap}>
              <MaterialIcons name="spa" size={28} color="#8B5A00" />
            </View>
            <Text style={styles.kicker}>Phone authentication</Text>
            <Text style={styles.title}>Continue with your phone</Text>
            
            {!confirmation ? (
              <AppInput 
                label="Phone Number" 
                value={phone} 
                onChangeText={(text) => {
                  setPhone(normalizeDigits(text, 10))
                  if (fieldErrors.phone) setFieldErrors({})
                }} 
                placeholder="Enter your 10-digit mobile number" 
                errorMessage={fieldErrors.phone}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!isSubmitting}
              />
            ) : (
              <AppInput 
                ref={codeInputRef}
                label="Verification Code" 
                value={code} 
                onChangeText={(text) => {
                  setCode(text.replace(/[^0-9]/g, ''))
                  if (fieldErrors.code) setFieldErrors({})
                }} 
                placeholder="Enter the 6-digit OTP" 
                errorMessage={fieldErrors.code}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!isSubmitting}
                maxLength={6}
              />
            )}
            
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            
            <Pressable 
              onPress={() => void handleContinue()} 
              disabled={isSubmitting} 
              style={({ pressed }) => [styles.button, pressed && !isSubmitting ? styles.buttonPressed : null, isSubmitting ? styles.buttonDisabled : null]}
            >
              <LinearGradient colors={['#7B4B00', '#B97512', '#E0A31F']} style={styles.primaryButton}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{confirmation ? 'Verify OTP' : 'Send OTP'}</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  backButton: { alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconWrap: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#E65C00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: '#2B231B', fontSize: 32, lineHeight: 38, fontWeight: '900', marginBottom: 6 },
  primaryButton: { minHeight: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  buttonPressed: { opacity: 0.85 },
  button: { borderRadius: 999 },
  buttonDisabled: { opacity: 0.7 },
  errorText: { color: '#B00020', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 4 },
})
