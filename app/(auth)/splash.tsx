import React from 'react'
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'

export default function SplashRoute() {
  const router = useRouter()

  return (
    <ImageBackground source={require('../../assets/gurudev.jpeg')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(34,20,9,0.36)', 'rgba(34,20,9,0.82)']} style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.badge}>
            <MaterialIcons name="spa" size={18} color="#8B5A00" />
            <Text style={styles.badgeText}>Jai Gurudev</Text>
          </View>
          <Text style={styles.title}>Shri Gurudev Ashram</Text>
          <Text style={styles.subtitle}>A warm digital space for yatra, seva, darshan timings, and ashram support.</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => router.push('/(auth)/login' as never)}>
              <LinearGradient colors={['#7B4B00', '#B97512', '#E0A31F']} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Continue</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  content: { padding: 24, paddingBottom: 42, gap: 18 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,247,235,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: { color: '#8B5A00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 42, lineHeight: 48, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.84)', fontSize: 16, lineHeight: 25 },
  actions: { gap: 12, marginTop: 6 },
  primaryButton: { minHeight: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  secondaryButtonText: { color: '#8B5A00', fontSize: 16, fontWeight: '900' },
})
