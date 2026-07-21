import React from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { refreshCurrentUser } from '../src/services/auth'
import { getCurrentProfileInfo, updateCurrentProfile, uploadProfileImage, type ProfileInfo } from '../src/services/profile'
import { useAuthStore } from '../src/store/useAuthStore'
import AppInput from '../src/components/AppInput'
import ImageUploadWidget from '../src/components/ImageUploadWidget'

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name']

export default function EditProfileRoute() {
  const router = useRouter()
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>()
  const insets = useSafeAreaInsets()
  const setUser = useAuthStore((state) => state.setUser)
  
  const [profile, setProfile] = React.useState<ProfileInfo | null>(null)
  const [fullName, setFullName] = React.useState('')
  const [profileImageUrl, setProfileImageUrl] = React.useState('')
  const [selectedImageUri, setSelectedImageUri] = React.useState<string | null>(null)
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const [fieldErrors, setFieldErrors] = React.useState<{ fullName?: string }>({})

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const profileInfo = await getCurrentProfileInfo()
      setProfile(profileInfo)
      setFullName(profileInfo.fullName || '')
      setProfileImageUrl(profileInfo.profileImageUrl ?? '')
      setSelectedImageUri(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load your profile.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadProfile()
  }, [loadProfile])



  const validate = () => {
    const trimmedName = fullName.trim()
    const nextErrors: typeof fieldErrors = {}

    if (!trimmedName) {
      nextErrors.fullName = 'Full name is required.'
    } else if (trimmedName.length < 2) {
      nextErrors.fullName = 'Please enter a valid full name.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (isSaving) return
    if (!validate()) return

    setIsSaving(true)
    setErrorMessage('')

    try {
      const trimmedName = fullName.trim()
      const nextImageUrl = selectedImageUri ? await uploadProfileImage(selectedImageUri) : profileImageUrl.trim() || null
      
      await updateCurrentProfile({
        fullName: trimmedName,
        profileImageUrl: nextImageUrl,
      })

      const refreshedUser = await refreshCurrentUser()
      if (refreshedUser) {
        setUser(refreshedUser)
      }

      if (onboarding) {
        const returnTo = params.returnTo as string | undefined
        if (returnTo) {
          router.replace(returnTo as never)
        } else {
          router.replace('/(tabs)/home' as never)
        }
      } else {
        router.back()
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E65C00" />
      </View>
    )
  }

  const displayImageSource = selectedImageUri
    ? { uri: selectedImageUri }
    : profileImageUrl
    ? { uri: profileImageUrl }
    : null

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            {!onboarding && (
              <Pressable style={styles.backButton} onPress={() => router.back()} disabled={isSaving}>
                <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
              </Pressable>
            )}
            <View>
              <Text style={styles.kicker}>Account settings</Text>
              <Text style={styles.title}>{onboarding ? 'Complete profile' : 'Edit profile'}</Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile Photo</Text>
            <ImageUploadWidget
              title="Profile picture"
              label={displayImageSource ? 'Image selected' : 'No file selected'}
              uri={displayImageSource ? displayImageSource.uri : null}
              onSelect={setSelectedImageUri}
              aspectRatio={[1, 1]}
              disabled={isSaving}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            
            <AppInput 
              label="Full Name (as per ID)"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text)
                if (fieldErrors.fullName) setFieldErrors({})
              }}
              placeholder="e.g. Anjali Deshmukh"
              errorMessage={fieldErrors.fullName}
              autoComplete="name"
              autoCapitalize="words"
              textContentType="name"
              returnKeyType="done"
              editable={!isSaving}
              onSubmitEditing={handleSave}
            />

            <ReadOnlyField icon="phone" label="Mobile Number" value={profile?.phone ?? 'Unavailable'} />
            
            {profile?.email ? (
              <ReadOnlyField icon="mail" label="Email" value={profile.email} />
            ) : null}
            
            <View style={styles.noteBox}>
              <MaterialIcons name="info-outline" size={18} color="#7E7162" />
              <Text style={styles.noteText}>Contact details are managed via authentication and cannot be edited directly.</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{onboarding ? 'Complete Setup' : 'Save Changes'}</Text>
                <MaterialIcons name="check" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ReadOnlyField({ icon, label, value }: { icon: MaterialIconName; label: string; value: string }) {
  return (
    <View style={styles.readOnlyField}>
      <View style={styles.readOnlyHeader}>
        <MaterialIcons name={icon} size={14} color="#9E9080" />
        <Text style={styles.readOnlyLabel}>{label}</Text>
      </View>
      <Text style={styles.readOnlyValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 48, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)' },
  kicker: { color: '#8B5A00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2C1D10', fontSize: 30, fontWeight: '900', marginTop: 2 },
  
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF8F8', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FFCDD2' },
  errorBannerText: { flex: 1, color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: 'rgba(139,90,0,0.08)', gap: 16 },
  sectionTitle: { color: '#2C1D10', fontSize: 18, fontWeight: '900' },
  
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  photoContainer: { position: 'relative', width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: '#F8F3EA', borderWidth: 1, borderColor: '#F0E7DD' },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  uploadingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  
  photoActions: { flex: 1, gap: 10, alignItems: 'flex-start' },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFF0D9', borderRadius: 999 },
  photoButtonText: { color: '#E65C00', fontSize: 14, fontWeight: '800' },
  cancelPhotoButton: { paddingHorizontal: 8 },
  cancelPhotoText: { color: '#D32F2F', fontSize: 13, fontWeight: '700' },

  readOnlyField: { backgroundColor: '#F9F6F0', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0E7DD' },
  readOnlyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  readOnlyLabel: { color: '#7E7162', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  readOnlyValue: { color: '#4A3B2C', fontSize: 16, fontWeight: '700' },
  
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FCFAF6', padding: 12, borderRadius: 12 },
  noteText: { flex: 1, color: '#7E7162', fontSize: 12, lineHeight: 18, fontWeight: '500' },

  primaryButton: { minHeight: 58, borderRadius: 999, backgroundColor: '#E65C00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
})
