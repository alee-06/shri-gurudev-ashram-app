import React from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { MaterialIcons } from '@expo/vector-icons'

type ImageUploadWidgetProps = {
  title: string
  label?: string
  uri: string | null
  errorMessage?: string
  onSelect: (uri: string | null) => void
  aspectRatio?: [number, number]
  disabled?: boolean
}

export default function ImageUploadWidget({
  title,
  label = 'No file selected',
  uri,
  errorMessage,
  onSelect,
  aspectRatio,
  disabled = false,
}: ImageUploadWidgetProps) {
  const pickImage = async () => {
    if (disabled) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload images.')
      return
    }

    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct enum value instead of ['images']
    }

    if (aspectRatio) {
      options.aspect = aspectRatio
    }

    const result = await ImagePicker.launchImageLibraryAsync(options)

    if (!result.canceled && result.assets?.[0]) {
      onSelect(result.assets[0].uri)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>{uri ? 'Image selected' : label}</Text>
        </View>
        <Pressable
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={pickImage}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>{uri ? 'Replace' : 'Upload'}</Text>
        </Pressable>
      </View>
      
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      
      {uri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri }} style={styles.image} contentFit="cover" />
          <Pressable 
            style={styles.removeButton} 
            onPress={() => onSelect(null)}
            disabled={disabled}
          >
            <MaterialIcons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable 
          style={[styles.placeholder, disabled && styles.placeholderDisabled]} 
          onPress={pickImage}
          disabled={disabled}
        >
          <MaterialIcons name="add-photo-alternate" size={32} color={disabled ? "#BDBDBD" : "#8B5A00"} />
          <Text style={[styles.placeholderText, disabled && styles.placeholderTextDisabled]}>Tap to choose image</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E7DD',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#2B231B',
    marginBottom: 2,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#7E7162',
  },
  button: {
    backgroundColor: '#FFF0D9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  buttonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  buttonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#E65C00',
  },
  error: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#D32F2F',
    marginBottom: 8,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5EDE4',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: '#E0D4C3',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
  },
  placeholderDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  placeholderText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#8B5A00',
    marginTop: 8,
  },
  placeholderTextDisabled: {
    color: '#9E9E9E',
  },
})
