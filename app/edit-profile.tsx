import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { refreshCurrentUser } from '../src/services/auth'
import { getCurrentProfileInfo, updateCurrentProfile, uploadProfileImage, type ProfileInfo } from '../src/services/profile'
import { useAuthStore } from '../src/store/useAuthStore'

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name']

export default function EditProfileRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const setUser = useAuthStore((state) => state.setUser)
  const [profile, setProfile] = React.useState<ProfileInfo | null>(null)
  const [fullName, setFullName] = React.useState('')
  const [profileImageUrl, setProfileImageUrl] = React.useState('')
  const [selectedImageUri, setSelectedImageUri] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const profileInfo = await getCurrentProfileInfo()
      setProfile(profileInfo)
      setFullName(profileInfo.fullName)
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

  const pickProfileImage = async () => {
    setErrorMessage('')
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to update your profile image.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      mediaTypes: ['images'],
    })

    const asset = result.assets?.[0]

    if (result.canceled || !asset) {
      return
    }

    setSelectedImageUri(asset.uri)
  }

  const handleSave = async () => {
    const trimmedName = fullName.trim()

    if (!trimmedName) {
      setErrorMessage('Full name is required.')
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      const nextImageUrl = selectedImageUri ? await uploadProfileImage(selectedImageUri) : profileImageUrl.trim() || null
      await updateCurrentProfile({
        fullName: trimmedName,
        profileImageUrl: nextImageUrl,
      })

      const refreshedUser = await refreshCurrentUser()
      if (refreshedUser) {
        setUser(refreshedUser)
      }

      Alert.alert('Profile updated', 'Your profile has been saved.', [
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const previewUri = selectedImageUri || profileImageUrl || profile?.profileImageUrl || null

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <View>
            <Text style={styles.kicker}>Profile</Text>
            <Text style={styles.title}>Edit Profile</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#8B5A00" />
            <Text style={styles.stateText}>Loading profile details</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            {!isLoading ? (
              <Pressable style={styles.retryButton} onPress={() => void loadProfile()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!isLoading ? (
          <>
            <View style={styles.imageCard}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.profileImage} contentFit="cover" />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialIcons name="person" size={42} color="#8B5A00" />
                </View>
              )}
              <Pressable style={styles.imageButton} disabled={isSaving} onPress={() => void pickProfileImage()}>
                <MaterialIcons name="add-photo-alternate" size={18} color="#993D00" />
                <Text style={styles.imageButtonText}>{previewUri ? 'Change Photo' : 'Choose Photo'}</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <EditableField label="Full Name" value={fullName} onChangeText={setFullName} editable={!isSaving} />
              <EditableField label="Profile Image URL" value={profileImageUrl} onChangeText={(value) => {
                setSelectedImageUri(null)
                setProfileImageUrl(value)
              }} editable={!isSaving} keyboardType="url" />
            </View>

            <View style={styles.card}>
              <ReadOnlyField icon="mail" label="Email" value={profile?.email ?? 'Unavailable'} />
              <ReadOnlyField icon="call" label="Phone" value={profile?.phone || 'Unavailable'} />
              <ReadOnlyField icon="badge" label="Aadhaar Number" value={profile?.aadhaarNumber || 'Not submitted'} />
              <ReadOnlyField icon="verified-user" label="Verification Status" value={formatVerificationStatus(profile?.verificationStatus ?? 'not_submitted')} />
            </View>

            <Pressable disabled={isSaving} style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={() => void handleSave()}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Profile'}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function EditableField({
  label,
  value,
  editable,
  keyboardType = 'default',
  onChangeText,
}: {
  label: string
  value: string
  editable: boolean
  keyboardType?: 'default' | 'url'
  onChangeText: (value: string) => void
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        placeholderTextColor="#9E9080"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'url' ? 'none' : 'words'}
        style={styles.input}
      />
    </View>
  )
}

function ReadOnlyField({ icon, label, value }: { icon: MaterialIconName; label: string; value: string }) {
  return (
    <View style={styles.readOnlyRow}>
      <MaterialIcons name={icon} size={20} color="#8B5A00" />
      <View style={styles.readOnlyCopy}>
        <Text style={styles.readOnlyLabel}>{label}</Text>
        <Text style={styles.readOnlyValue}>{value}</Text>
      </View>
    </View>
  )
}

function formatVerificationStatus(status: ProfileInfo['verificationStatus']) {
  if (status === 'submitted') {
    return 'Under Review'
  }

  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
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
  stateCard: { backgroundColor: '#fff', borderRadius: 24, padding: 22, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F0E7DD' },
  stateText: { color: '#7E7162', fontSize: 13, fontWeight: '800' },
  errorCard: { backgroundColor: '#FFF7EB', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#FFE0B3', gap: 10 },
  errorText: { color: '#B3261E', fontSize: 13, fontWeight: '700' },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  retryButtonText: { color: '#8B5A00', fontSize: 12, fontWeight: '900' },
  imageCard: { borderRadius: 26, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#F0E7DD', alignItems: 'center', gap: 14 },
  profileImage: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#FFF0D9' },
  profileImagePlaceholder: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center' },
  imageButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: '#FFF0D9', paddingHorizontal: 14, paddingVertical: 10 },
  imageButtonText: { color: '#993D00', fontSize: 13, fontWeight: '900' },
  card: { borderRadius: 26, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#F0E7DD', gap: 14 },
  field: { gap: 8 },
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
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  readOnlyCopy: { flex: 1, gap: 3 },
  readOnlyLabel: { color: '#9E9080', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  readOnlyValue: { color: '#2B231B', fontSize: 15, fontWeight: '800' },
  saveButton: { minHeight: 58, borderRadius: 999, backgroundColor: '#E65C00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  disabledButton: { opacity: 0.7 },
})
