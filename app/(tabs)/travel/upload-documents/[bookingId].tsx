import React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBookingDraftStore } from '../../../../src/store/useBookingDraftStore'

export default function UploadDocumentsRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { bookingId, bookingReference } = useLocalSearchParams<{ bookingId: string; bookingReference: string }>()
  const draft = useBookingDraftStore()

  const pickImage = async (target: 'aadhaar' | 'selfie') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload documents.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    const asset = result.assets?.[0]
    if (result.canceled || !asset) return

    if (target === 'aadhaar') {
      draft.updateField('aadhaarPhotoLabel', asset.fileName ?? 'Aadhaar document')
      draft.updateField('aadhaarPhotoUri', asset.uri)
      return
    }

    draft.updateField('selfiePhotoLabel', asset.fileName ?? 'Selfie photo')
    draft.updateField('selfiePhotoUri', asset.uri)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <View>
            <Text style={styles.kicker}>Document upload</Text>
            <Text style={styles.title}>{bookingId}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Aadhaar Number</Text>
          <TextInput
            value={draft.aadhaarNumber}
            onChangeText={(value) => draft.updateField('aadhaarNumber', value.replace(/[^\d]/g, '').slice(0, 12))}
            placeholder="Enter Aadhaar number"
            placeholderTextColor="#9E9080"
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>

        <DocumentCard
          title="Aadhaar document"
          label={draft.aadhaarPhotoLabel}
          uri={draft.aadhaarPhotoUri}
          onPress={() => void pickImage('aadhaar')}
        />
        <DocumentCard title="Selfie photo" label={draft.selfiePhotoLabel} uri={draft.selfiePhotoUri} onPress={() => void pickImage('selfie')} />

        <Pressable style={styles.primaryButton} onPress={() => router.push({
          pathname: '/(tabs)/travel/payment',
          params: { bookingId, bookingReference }
        } as never)}>
          <Text style={styles.primaryButtonText}>Continue to Payment</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function DocumentCard({ title, label, uri, onPress }: { title: string; label: string; uri: string; onPress: () => void }) {
  return (
    <View style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <View>
          <Text style={styles.documentTitle}>{title}</Text>
          <Text style={styles.documentHint}>{label || 'No file selected'}</Text>
        </View>
        <Pressable style={styles.uploadButton} onPress={onPress}>
          <Text style={styles.uploadButtonText}>{uri ? 'Replace' : 'Upload'}</Text>
        </Pressable>
      </View>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} contentFit="cover" />
      ) : (
        <Pressable style={styles.placeholder} onPress={onPress}>
          <MaterialIcons name="add-photo-alternate" size={34} color="#8B5A00" />
          <Text style={styles.placeholderText}>Tap to choose image</Text>
        </Pressable>
      )}
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
  documentCard: { borderRadius: 26, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#F0E7DD', gap: 14 },
  documentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  documentTitle: { color: '#2B231B', fontSize: 16, fontWeight: '900' },
  documentHint: { color: '#9E9080', fontSize: 12, fontWeight: '700', marginTop: 4 },
  uploadButton: { borderRadius: 999, backgroundColor: '#FFF0D9', paddingHorizontal: 14, paddingVertical: 10 },
  uploadButtonText: { color: '#993D00', fontSize: 13, fontWeight: '900' },
  preview: { width: '100%', height: 190, borderRadius: 18 },
  placeholder: {
    height: 190,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F0E7DD',
    backgroundColor: '#FCFAF6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { color: '#7E7162', fontSize: 13, fontWeight: '800' },
  primaryButton: {
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: '#E65C00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
})
