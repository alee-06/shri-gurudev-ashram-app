import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, {
  FadeInDown,
  FadeInUp,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import EmptyState from '../../../src/components/EmptyState'
import { fetchPackages } from '../../../src/services/packages'
import { useBookingDraftStore } from '../../../src/store/useBookingDraftStore'
import { TravelPackage } from '../../../src/types/travel'

const CARD_IMAGES = [
  'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=1400&auto=format&fit=crop',
]

const CARD_META = [
  { badge: '12 seats left', secondaryBadge: 'High demand', tags: ['Temple mornings', 'Seva support', 'Private stays'] },
  { badge: '8 seats left', secondaryBadge: 'Limited batch', tags: ['Meditation deck', 'Guided darshan', 'Himalayan views'] },
  { badge: '16 seats left', secondaryBadge: 'Curated route', tags: ['Backwater calm', 'Ayurvedic meals', 'Luxury stay'] },
  { badge: '10 seats left', secondaryBadge: 'Signature journey', tags: ['Royal heritage', 'Evening aarti', 'Palace stays'] },
]

function PremiumTravelCard({
  item,
  index,
  onPress,
}: {
  item: TravelPackage
  index: number
  onPress: () => void
}) {
  const pressScale = useSharedValue(1)
  const meta = CARD_META[index % CARD_META.length]

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }))

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(pressScale.value, [0.94, 1], [2, 0]),
      },
    ],
  }))

  return (
    <Animated.View
      entering={FadeInDown.delay(80 * index).duration(650)}
      layout={LinearTransition.springify()}
      style={styles.cardWrap}
    >
      <Animated.View style={cardStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            pressScale.value = withTiming(0.985, { duration: 120 })
          }}
          onPressOut={() => {
            pressScale.value = withTiming(1, { duration: 180 })
          }}
          style={styles.cardPressable}
        >
          <View style={styles.cardShell}>
          <Animated.View style={[styles.cardImageWrap, imageStyle]}>
            <Image source={{ uri: CARD_IMAGES[index % CARD_IMAGES.length] }} style={styles.cardImage} contentFit="cover" transition={240} />

            <LinearGradient
              colors={['rgba(17,10,3,0.02)', 'rgba(17,10,3,0.48)', 'rgba(17,10,3,0.78)']}
              locations={[0, 0.62, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.cardTopRow}>
              <View style={styles.badgePill}>
                <MaterialIcons name="confirmation-number" size={12} color="#8B5A00" />
                <Text style={styles.badgeText}>{meta.badge}</Text>
              </View>
              <View style={[styles.badgePill, styles.badgePillDark]}>
                <MaterialIcons name="whatshot" size={12} color="#fff" />
                <Text style={[styles.badgeText, styles.badgeTextDark]}>{meta.secondaryBadge}</Text>
              </View>
            </View>

            <View style={styles.cardImageFooter}>
              <View style={styles.locationRow}>
                <MaterialIcons name="place" size={16} color="#F6E7CE" />
                <Text style={styles.locationText}>{item.title}</Text>
              </View>

              <Text style={styles.heroDescription}>{item.description}</Text>
            </View>
          </Animated.View>

          <View style={styles.cardBody}>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <MaterialIcons name="event" size={14} color="#8B5A00" />
                <Text style={styles.metaText}>{item.duration}</Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialIcons name="hotel" size={14} color="#8B5A00" />
                <Text style={styles.metaText}>Comfort stay</Text>
              </View>
            </View>

            <View style={styles.tagsRow}>
              {meta.tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.priceRow}>
              <View>
                <Text style={styles.startingFrom}>Starting from</Text>
                <Text style={styles.price}>{item.price}</Text>
              </View>

              <View style={styles.ctaWrap}>
                <Pressable onPress={onPress}>
                  <LinearGradient
                    colors={['#7B4B00', '#B97512', '#E0A31F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ctaButton}
                  >
                    <MaterialIcons name="auto-awesome" size={14} color="#fff" />
                    <Text style={styles.ctaText}>Begin Yatra</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  )
}

export default function TravelListRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const setSelectedPackage = useBookingDraftStore((state) => state.setSelectedPackage)
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['travelPackages'],
    queryFn: fetchPackages,
  })

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <View style={styles.topSection}>
          <Text style={styles.topSectionTitle}>YATRA PACKAGES</Text>
          <View style={styles.actionCardsRow}>
            <Pressable
              onPress={() => router.push('/(tabs)/travel/booking-history' as never)}
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
            >
              <MaterialIcons name="event-note" size={24} color="#8B5A00" />
              <Text style={styles.actionCardText}>My Bookings</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
              <MaterialIcons name="map" size={24} color="#8B5A00" />
              <Text style={styles.actionCardText}>Sacred Routes</Text>
            </Pressable>
          </View>
        </View>

        <Animated.View entering={FadeInUp.duration(500)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.9/5</Text>
            <Text style={styles.statLabel}>Guest rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>10,000+</Text>
            <Text style={styles.statLabel}>Sadhaks served</Text>
          </View>
        </Animated.View>

        <View style={styles.cardsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Featured yatras</Text>
            <View style={styles.sectionLine} />
          </View>

          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#8B5A00" />
              <Text style={styles.loadingText}>Loading live yatras</Text>
            </View>
          ) : null}

          {isError ? (
            <View style={styles.errorWrap}>
              <EmptyState title="Could not load packages" message="Please try again." actionLabel="Retry" onAction={() => void refetch()} />
            </View>
          ) : null}

          {!isError && !isLoading && data.length === 0 ? (
            <View style={styles.errorWrap}>
              <EmptyState title="No active packages" message="No travel package is active right now." />
            </View>
          ) : null}

          {!isError
            ? data.map((item, index) => (
                <PremiumTravelCard
                  key={item.id}
                  item={item}
                  index={index}
                  onPress={() => {
                    setSelectedPackage(item)
                    router.push(`/(tabs)/travel/package/${item.id}` as never)
                  }}
                />
              ))
            : null}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  scrollContent: {
    paddingBottom: 164,
  },
  topSection: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  topSectionTitle: {
    fontSize: 34,
    fontFamily: 'serif',
    fontWeight: '700',
    color: '#3A2412',
    letterSpacing: 1.2,
    marginBottom: 24,
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    shadowColor: '#2D1A0C',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  actionCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  actionCardText: {
    color: '#6F4600',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  statsRow: {
    marginTop: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    shadowColor: '#3A2412',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    alignItems: 'center',
  },
  statValue: {
    color: '#8B5A00',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#6B5A4A',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#6F4600',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139,90,0,0.12)',
  },
  cardsSection: {
    marginTop: 26,
    paddingBottom: 8,
  },
  loadingCard: {
    marginHorizontal: 18,
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    gap: 10,
  },
  loadingText: {
    color: '#6B5A4A',
    fontSize: 13,
    fontWeight: '700',
  },
  errorWrap: {
    marginHorizontal: 18,
  },
  cardWrap: {
    marginHorizontal: 18,
    marginBottom: 18,
  },
  cardPressable: {
    borderRadius: 30,
  },
  cardShell: {
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
    shadowColor: '#2D1A0C',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  cardImageWrap: {
    minHeight: 280,
    justifyContent: 'space-between',
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 16,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,247,235,0.92)',
    maxWidth: '50%',
  },
  badgePillDark: {
    backgroundColor: 'rgba(17,10,3,0.56)',
  },
  badgeText: {
    color: '#8B5A00',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTextDark: {
    color: '#FFF2DB',
  },
  cardImageFooter: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locationText: {
    color: '#F8ECDD',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 330,
  },
  cardBody: {
    padding: 18,
    backgroundColor: '#FFFDF9',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7EFE4',
  },
  metaText: {
    color: '#6E5742',
    fontSize: 12,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(139,90,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.08)',
  },
  tagText: {
    color: '#7B5B3A',
    fontSize: 11,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 14,
  },
  startingFrom: {
    color: '#867664',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  price: {
    color: '#8B5A00',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  ctaWrap: {
    flexShrink: 0,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 128,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#7B4B00',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
})
