import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Reanimated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { SEVA_LABELS } from '../../src/constants/seva'
import { fetchUpcomingSevas } from '../../src/services/seva'
import { useAuthStore } from '../../src/store/useAuthStore'
import type { UpcomingSeva } from '../../src/types/seva'

const COLORS = {
  background: '#F8F6F2',
  primary: '#8B5A00',
  secondaryText: '#6B6B6B',
  white: '#FFFFFF',
  gold: '#D89B1D',
  shadow: '#000',
}

export type HomeServiceConfig = {
  id: string
  title: string
  icon: string
  route: string
  enabled: boolean
}

const ASHRAM_SERVICES_CONFIG: HomeServiceConfig[] = [
  { id: 'travel', title: 'Book Travel', icon: 'flight', route: '/(tabs)/travel', enabled: true },
  { id: 'annadan', title: 'Annadan', icon: 'restaurant', route: '/(tabs)/seva/annadan', enabled: true },
  { id: 'yajman', title: 'Guruji Aarti Seva', icon: 'local-fire-department', route: '/(tabs)/seva/yajman', enabled: true },
  { id: 'donations', title: 'Donations', icon: 'volunteer-activism', route: '/donation', enabled: true },
  { id: 'activity', title: 'My Activity', icon: 'history', route: '/(tabs)/my-sevas', enabled: true },
  { id: 'collector', title: 'Verify Collector', icon: 'verified-user', route: '/collector-dashboard', enabled: true },
  { id: 'announcements', title: 'Announcements', icon: 'campaign', route: '/(tabs)/notifications', enabled: true },
]

const infoSections = [
  {
    title: 'AARTIS AND DISCOURSES',
    items: [
      'Kakda Aarti - 4:00 AM',
      'Daily Morning Aarti - 6:00 AM',
      'Breakfast',
      'Lunch',
      'Haripath - 6:00 PM',
      'Dinner',
      'Gita Path - 8:00 PM',
    ],
  },
  {
    title: 'Darshan Timings',
    items: ['04:30 am to 01:00 pm', '04:30 pm to 09:00 pm', 'Temple timings may change on special occasions.'],
  },
  {
    title: 'Shri Gurudev Ashram',
    items: [
      'Shri Gurudev Ashram, Palaskhed Sapkal, Tehsil Chikhli, District Buldhana, Maharashtra - 443001',
      'Swami Harichaitanya Shanti Ashram Trust, Datala, Tehsil Malkapur, District Buldhana - 443102',
    ],
  },
  {
    title: 'FOLLOW US',
    items: [
      '@swamiharichaitanyanands',
      'Phone: 9158740007, 9834151577',
      'Website: www.shrigurudevashram.org',
      'Email: info@shrigurudevashram.org',
      'Email: info@shantiashramtrust.org',
    ],
  },
  {
    title: 'Ashram Branches',
    items: [
      'Shri Vaishnavi Gita Ashram, Malvihir, District Buldhana',
      'Shri Harichaitanya Shanti Ashram, Datala, Tehsil Malkapur, District Buldhana',
      'Shri Gurudev Ashram, Muktainagar, District Jalgaon',
      'Shri Gurudev Ashram, Kothala, Tehsil Manwat, District Parbhani',
      'Shri Harichaitanya Godham, Shindi Harali, Chikhli, District Buldhana',
      'Shri Balmukund Ashram, Belgaum, Karnataka',
    ],
  },
  {
    title: 'Bank Account Details',
    items: [
      'Shri Gurudev Ashram',
      'State Bank of India',
      'A/c No: 32035015646',
      'IFSC: SBIN0008409',
      'Branch: Shelsur',
      'Swami Hari Chaitanya Shanti Ashram Trust',
      'HDFC Bank',
      'A/c: 50200089955981',
      'IFSC: HDFC0002489',
      'Branch: Buldhana',
    ],
  },
]

const dedicationText = 'Dedicated to Param Pujya Shri Swami Harichaitanyanand Saraswatiji Maharaj'

type InfoSection = (typeof infoSections)[number]

// ─── Upcoming Sevas Feed ────────────────────────────────────────────────────
function UpcomingSevasFeed() {
  const router = useRouter()
  const [sevas, setSevas] = useState<UpcomingSeva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingSevas()
      .then(setSevas)
      .catch(() => setSevas([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (sevas.length === 0) return null

  return (
    <View style={sevaStyles.section}>
      <View style={sevaStyles.sectionHeader}>
        <Text style={sevaStyles.heading}>Upcoming Ashram Services</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/my-sevas' as never)} style={sevaStyles.mySevasLink}>
          <MaterialIcons name="history" size={14} color="#8B5A00" />
          <Text style={sevaStyles.mySevasLinkText}>My Activity →</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sevaStyles.scroll}
      >
        {sevas.map((seva) => {
          const label = SEVA_LABELS[seva.sevaType]
          const dateStr = new Date(seva.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          })
          const href = seva.sevaType === 'annadan'
            ? '/(tabs)/seva/annadan'
            : '/(tabs)/seva/yajman'

          return (
            <Pressable
              key={seva.id}
              style={[sevaStyles.chip, !seva.isAvailable && sevaStyles.chipBooked]}
              onPress={() => seva.isAvailable && router.push(href as never)}
            >
              <View style={[sevaStyles.chipIcon, { backgroundColor: `${label.color}18` }]}>
                <MaterialIcons name={label.icon as any} size={18} color={seva.isAvailable ? label.color : '#B9B1A9'} />
              </View>
              <View style={sevaStyles.chipText}>
                <Text style={[sevaStyles.chipTitle, !seva.isAvailable && sevaStyles.chipTitleBooked]}>
                  {label.title}
                </Text>
                <Text style={sevaStyles.chipDate}>{dateStr}</Text>
                <Text style={[sevaStyles.chipStatus, { color: seva.isAvailable ? '#2F7132' : '#B9B1A9' }]}>
                  {seva.isAvailable
                    ? `${seva.spotsLeft ?? ''} ${seva.spotsLeft === 1 ? 'spot' : 'spots'} available`
                    : 'Already Sponsored'}
                </Text>
              </View>
              <View style={[sevaStyles.quickBtn, !seva.isAvailable && sevaStyles.quickBtnDisabled]}>
                <Text style={[sevaStyles.quickBtnText, !seva.isAvailable && { color: '#B9B1A9' }]}>
                  {seva.isAvailable ? 'Book →' : 'Closed'}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const sevaStyles = StyleSheet.create({
  section: { marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginHorizontal: 22, marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8B5A00',
  },
  mySevasLink: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF0D9', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  mySevasLinkText: { color: '#8B5A00', fontSize: 12, fontWeight: '800' },
  scroll: { paddingHorizontal: 22, gap: 12 },
  chip: {
    width: 146,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0E7DD',
    shadowColor: '#5B4636',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chipBooked: { opacity: 0.65 },
  chipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { gap: 2 },
  chipTitle: { color: '#2B231B', fontSize: 13, fontWeight: '800' },
  chipTitleBooked: { color: '#9E9080' },
  chipDate: { color: '#8B5A00', fontSize: 15, fontWeight: '900' },
  chipStatus: { fontSize: 11, fontWeight: '700' },
  quickBtn: {
    marginTop: 4,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#E8D5BE',
    alignItems: 'center',
  },
  quickBtnDisabled: { backgroundColor: '#F5EDE4', borderColor: '#F0E7DD' },
  quickBtnText: { color: '#8B5A00', fontSize: 12, fontWeight: '900' },
})

function InfoAccordionCard({
  section,
  expanded,
  onToggle,
}: {
  section: InfoSection
  expanded: boolean
  onToggle: () => void
}) {
  const arrowProgress = useSharedValue(expanded ? 1 : 0)

  useEffect(() => {
    arrowProgress.value = withTiming(expanded ? 1 : 0, { duration: 260 })
  }, [arrowProgress, expanded])

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowProgress.value * 180}deg` }],
  }))

  const visibleItems = expanded ? section.items : section.items.slice(0, Math.min(2, section.items.length))

  return (
    <Reanimated.View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{section.title}</Text>
      <View style={styles.divider} />

      <Reanimated.View>
        {visibleItems.map((item, itemIndex) => (
          <Reanimated.View
            key={`${section.title}-${itemIndex}`}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
          >
            <Text style={[styles.infoText, itemIndex === 0 && styles.infoTextFirst]}>{item}</Text>
            {itemIndex < visibleItems.length - 1 ? <View style={styles.subDivider} /> : null}
          </Reanimated.View>
        ))}
      </Reanimated.View>

      {section.items.length > visibleItems.length ? <Text style={styles.previewHint}>Tap the arrow to view more</Text> : null}

      <TouchableOpacity onPress={onToggle} style={styles.expandButton} activeOpacity={0.8}>
        <Reanimated.View style={arrowStyle}>
          <MaterialIcons name="keyboard-arrow-down" size={30} color={COLORS.primary} />
        </Reanimated.View>
      </TouchableOpacity>
    </Reanimated.View>
  )
}

export default function HomeRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const isCollector = user?.role === 'collector'
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const drawerAnim = useRef(new Animated.Value(0)).current
  const heroFade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: drawerOpen ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start()
  }, [drawerAnim, drawerOpen, heroFade])

  const drawerTranslateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  })

  const drawerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dy) < 18,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            drawerAnim.setValue(Math.max(0, 1 + gestureState.dx / 240))
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          setDrawerOpen(gestureState.dx >= -60)
        },
      }),
    [drawerAnim],
  )

  const closeDrawer = () => setDrawerOpen(false)

  const toggleSection = (title: string) => {
    setExpandedSections((current) => ({
      ...current,
      [title]: !current[title],
    }))
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />

      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 12) + 6 }]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuButton}>
              <MaterialIcons name="menu" size={30} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>ASHRAM APP</Text>

            <TouchableOpacity onPress={() => router.push('/(tabs)/notifications' as never)}>
              <MaterialIcons name="notifications-none" size={30} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.heroFadeWrap, { opacity: heroFade }]}>
            <View style={styles.heroCard}>
              <View style={styles.heroTitleBlock}>
                <Text style={styles.heroAppTitle}>ASHRAM APP</Text>

                <View style={styles.radheRow}>
                  <MaterialIcons name="music-note" size={22} color={COLORS.gold} />
                  <Text style={styles.radheText}>Radhe Radhe</Text>
                  <MaterialIcons name="music-note" size={22} color={COLORS.gold} />
                </View>
              </View>

              <View style={styles.gurudevImageWrap}>
                <Image source={require('../../assets/gurudev.jpeg')} style={styles.gurudevImage} />
              </View>

              <Text style={styles.gurudevCopy}>
                Param Pujya Shri Swami Harichaitanyanand Saraswatiji Maharaj's seva kshetra for bhakti, gyan and nishkam seva
              </Text>
            </View>
          </Animated.View>

          <Text style={styles.sectionTitle}>Essential Services</Text>

          <View style={styles.grid}>
            {ASHRAM_SERVICES_CONFIG
              .filter((s) => s.enabled && (s.id !== 'collector' || isCollector))
              .map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => {
                    router.push(item.route as never)
                }}
                activeOpacity={0.86}
              >
                <MaterialIcons name={item.icon as any} size={42} color={COLORS.primary} />
                <Text style={styles.cardText}>{item.title}</Text>
                <View style={styles.circleDecoration} />
              </TouchableOpacity>
            ))}
          </View>

          <UpcomingSevasFeed />

          <View style={styles.infoSection}>
            {infoSections.map((section) => (
              <InfoAccordionCard
                key={section.title}
                section={section}
                expanded={!!expandedSections[section.title]}
                onToggle={() => toggleSection(section.title)}
              />
            ))}

            <View style={styles.dedicationCard}>
              <Text style={styles.dedicationText}>{dedicationText}</Text>
              <View style={styles.divider} />
              <Text style={styles.footerNoteText}>Donations are tax-exempt under Section 80G of the Income Tax Act, 1961.</Text>
            </View>
          </View>
        </ScrollView>

        {drawerOpen ? <Pressable style={styles.backdrop} onPress={closeDrawer} /> : null}

        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTranslateX }] }]} {...drawerPanResponder.panHandlers}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>ASHRAM APP</Text>
            <TouchableOpacity onPress={closeDrawer}>
              <MaterialIcons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {[
            ['About Ashram', '/help-support'],
            ['Activities & Yatra', '/(tabs)/travel'],
            ['Announcements', '/(tabs)/notifications'],
            ['Donate', '/donation'],
            ['Contact Us', '/help-support'],
          ].map(([label, href]) => (
            <TouchableOpacity
              key={label}
              style={styles.drawerItem}
              onPress={() => {
                closeDrawer()
                router.push(href as never)
              }}
            >
              <Text style={styles.drawerItemText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.10)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  heroFadeWrap: {
    paddingHorizontal: 22,
  },
  heroCard: {
    marginTop: 6,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(216,155,29,0.10)',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroTitleBlock: {
    alignItems: 'center',
    marginBottom: 14,
  },
  heroAppTitle: {
    fontSize: 24,
    letterSpacing: 2,
    color: COLORS.primary,
    fontWeight: '800',
  },
  radheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  radheText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  gurudevImageWrap: {
    width: '100%',
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#f6efe5',
  },
  gurudevImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    transform: [{ translateX: -27 }],
  },
  gurudevCopy: {
    color: COLORS.secondaryText,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 34,
    marginBottom: 24,
    marginHorizontal: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 34,
    alignItems: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5A4A42',
    marginTop: 16,
    textAlign: 'center',
  },
  circleDecoration: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.03)',
    bottom: -40,
    right: -40,
  },
  infoSection: {
    paddingHorizontal: 22,
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(216,155,29,0.10)',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(139,90,0,0.10)',
    marginBottom: 8,
  },
  subDivider: {
    height: 1,
    backgroundColor: 'rgba(139,90,0,0.08)',
    marginVertical: 8,
  },
  previewHint: {
    color: COLORS.secondaryText,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  expandButton: {
    marginTop: 14,
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(216,155,29,0.12)',
  },
  infoText: {
    color: '#4F4337',
    fontSize: 14,
    lineHeight: 22,
  },
  infoTextFirst: {
    marginTop: 4,
  },
  dedicationCard: {
    backgroundColor: 'rgba(216,155,29,0.10)',
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(216,155,29,0.18)',
  },
  dedicationText: {
    color: COLORS.primary,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '700',
  },
  footerNoteText: {
    color: COLORS.primary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(32, 19, 9, 0.34)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    backgroundColor: 'rgba(255, 252, 246, 0.96)',
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(216,155,29,0.12)',
    paddingTop: 18,
    paddingHorizontal: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 8, height: 0 },
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  drawerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,90,0,0.08)',
  },
  drawerItemText: {
    fontSize: 15,
    color: '#45382d',
    fontWeight: '600',
  },
})
