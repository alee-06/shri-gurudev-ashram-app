import React from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AppButton from '../../../../src/components/AppButton'
import { fetchPackages } from '../../../../src/services/packages'
import { useBookingDraftStore } from '../../../../src/store/useBookingDraftStore'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1400&auto=format&fit=crop'

export default function PackageDetailsRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const setSelectedPackage = useBookingDraftStore((state) => state.setSelectedPackage)
  const { data = [], isLoading } = useQuery({ queryKey: ['travelPackages'], queryFn: fetchPackages })
  const packageItem = data.find((item) => item.id === id)

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator color="#8B5A00" />
          <Text style={styles.centerText}>Preparing yatra details</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!packageItem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <MaterialIcons name="travel-explore" size={38} color="#8B5A00" />
          <Text style={styles.centerTitle}>Package unavailable</Text>
          <Text style={styles.centerText}>This yatra is no longer active.</Text>
          <AppButton title="Back to Travel" onPress={() => router.replace('/(tabs)/travel' as never)} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 24) + 100 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <Text style={styles.headerTitle}>Yatra Details</Text>
          <Pressable style={styles.iconButton}>
            <MaterialIcons name="favorite-border" size={22} color="#8B5A00" />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient colors={['rgba(17,10,3,0.02)', 'rgba(17,10,3,0.72)']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroCopy}>
            <View style={styles.heroPill}>
              <MaterialIcons name="auto-awesome" size={13} color="#8B5A00" />
              <Text style={styles.heroPillText}>Sacred route</Text>
            </View>
            <Text style={styles.title}>{packageItem.title}</Text>
            <Text style={styles.subtitle}>{packageItem.description}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <MaterialIcons name="event" size={20} color="#8B5A00" />
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{packageItem.duration}</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialIcons name="payments" size={20} color="#8B5A00" />
            <Text style={styles.summaryLabel}>Starting from</Text>
            <Text style={styles.summaryValue}>{packageItem.price}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Yatra inclusions</Text>
          {['Guided darshan coordination', 'Comfortable stay support', 'Seva-focused travel assistance'].map((item) => (
            <View key={item} style={styles.inclusionRow}>
              <MaterialIcons name="check-circle" size={18} color="#B97512" />
              <Text style={styles.inclusionText}>{item}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => {
            setSelectedPackage(packageItem)
            router.push('/(tabs)/travel/booking' as never)
          }}
        >
          <LinearGradient colors={['#7B4B00', '#B97512', '#E0A31F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start Booking</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  content: {
    paddingHorizontal: 18,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
  },
  headerTitle: {
    color: '#6F4600',
    fontSize: 18,
    fontWeight: '900',
  },
  heroCard: {
    minHeight: 430,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#2D1A0C',
    shadowColor: '#2D1A0C',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroCopy: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 22,
  },
  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,247,235,0.92)',
    marginBottom: 14,
  },
  heroPillText: {
    color: '#8B5A00',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    shadowColor: '#3A2412',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  summaryLabel: {
    color: '#867664',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 10,
  },
  summaryValue: {
    color: '#8B5A00',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    gap: 12,
  },
  sectionTitle: {
    color: '#3A2412',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inclusionText: {
    color: '#6E5742',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#7B4B00',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  centerState: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  centerTitle: {
    color: '#3A2412',
    fontSize: 20,
    fontWeight: '900',
  },
  centerText: {
    color: '#6B5A4A',
    fontSize: 14,
    textAlign: 'center',
  },
})
