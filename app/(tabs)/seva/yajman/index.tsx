import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSevaStore } from '../../../../src/store/useSevaStore'
import { checkYajmanAvailability, fetchSevaPricing, fetchSevaMonthlyAvailability, DateAvailabilityInfo } from '../../../../src/services/seva'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
function toIso(d: Date): string { return d.toISOString().split('T')[0] }
function buildCalendar(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

// ─── What being Yajman means ─────────────────────────────────────────────────
const YAJMAN_STEPS = [
  {
    icon: 'local-fire-department',
    step: '01',
    title: 'Guruji conducts a Katha',
    body: 'A special Katha (spiritual discourse) is organized at the Ashram. Hundreds of devotees attend to receive Guruji\'s blessings.',
  },
  {
    icon: 'brightness-5',
    step: '02',
    title: 'You become the Yajman',
    body: 'As Yajman, you are the principal devotee of that day\'s Katha. The entire seva is performed in your name and your family\'s name.',
  },
  {
    icon: 'self-improvement',
    step: '03',
    title: 'You perform Guruji\'s Aarti',
    body: 'At the culmination of the Katha, you personally perform Guruji\'s Aarti — a once-in-a-lifetime spiritual moment for most devotees.',
  },
  {
    icon: 'volunteer-activism',
    step: '04',
    title: 'Blessings for your family',
    body: 'Guruji personally blesses the Yajman and their family. The merit of this seva is immeasurable.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function YajmanCalendarRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const setSevaType = useSevaStore((s) => s.setSevaType)
  const setSelectedDate = useSevaStore((s) => s.setSelectedDate)
  const resetSeva = useSevaStore((s) => s.resetSeva)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedIso, setSelectedIso] = useState('')
  const [checking, setChecking] = useState(false)
  const [availabilityMsg, setAvailabilityMsg] = useState<{ available: boolean; reason?: string } | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [yajmanPrice, setYajmanPrice] = useState<number>(5100)
  const [monthlyAvailability, setMonthlyAvailability] = useState<Record<string, DateAvailabilityInfo>>({})
  const [loadingMonth, setLoadingMonth] = useState(false)

  useEffect(() => {
    fetchSevaPricing().then((p) => { if (p?.yajman) setYajmanPrice(p.yajman) }).catch(() => {})
    resetSeva()
    setSevaType('yajman')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    setLoadingMonth(true)
    fetchSevaMonthlyAvailability('yajman', monthStr)
      .then((map) => setMonthlyAvailability(map))
      .catch((e) => console.error('Failed to load Yajman month availability:', e))
      .finally(() => setLoadingMonth(false))
  }, [viewYear, viewMonth])

  const cells = buildCalendar(viewYear, viewMonth)
  const isPast = (date: Date) => {
    const d = new Date(date); d.setHours(0,0,0,0)
    const t = new Date(today); t.setHours(0,0,0,0)
    return d < t
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
    setSelectedIso(''); setAvailabilityMsg(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
    setSelectedIso(''); setAvailabilityMsg(null)
  }

  const onSelectDate = async (date: Date) => {
    const iso = toIso(date)
    setSelectedIso(iso)
    setAvailabilityMsg(null)
    setChecking(true)
    try {
      const result = await checkYajmanAvailability(iso)
      setAvailabilityMsg(result)
    } finally {
      setChecking(false)
    }
  }

  const onContinue = () => {
    if (!selectedIso || !availabilityMsg?.available) return
    setSelectedDate(selectedIso)
    router.push('/(tabs)/seva/yajman/details' as never)
  }

  const formattedSelected = selectedIso
    ? new Date(selectedIso).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#8B5A00" />
          </Pressable>
          <View>
            <Text style={styles.kicker}>Yajman Booking</Text>
            <Text style={styles.title}>Guruji Aarti Seva</Text>
          </View>
        </View>

        {/* Hero Banner */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={['#4A2E00', '#8B5A00', '#C4892B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroIconRing}>
              <MaterialIcons name="local-fire-department" size={32} color="#B97512" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroBannerTitle}>Become Today's Yajman</Text>
              <Text style={styles.heroBannerBody}>
                Receive the sacred privilege of performing Guruji's Aarti during the Katha. Only one Yajman is chosen per Katha.
              </Text>
              <View style={styles.heroPricePill}>
                <Text style={styles.heroPriceText}>₹{yajmanPrice.toLocaleString('en-IN')} · One Yajman Per Katha</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* What is a Katha? */}
        <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What is Guruji's Katha?</Text>
          <Text style={styles.sectionBody}>
            A <Text style={styles.sectionBold}>Katha</Text> is a sacred spiritual discourse conducted by Param Pujya Shri Swami Harichaitanyanand Saraswatiji Maharaj. Hundreds of devotees gather to receive Guruji's wisdom, blessings, and the opportunity for personal darshan.
          </Text>
          <Text style={styles.sectionBody}>
            The <Text style={styles.sectionBold}>Yajman</Text> is the principal devotee — the one who has the honour of performing Guruji's Aarti at the culmination of the Katha.
          </Text>
        </Animated.View>

        {/* Journey as Yajman */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <Text style={styles.stepsHeading}>Your Journey as Yajman</Text>
          {YAJMAN_STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumberWrap}>
                <Text style={styles.stepNumber}>{step.step}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Select Katha Date */}
        <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Select Katha Date</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a Katha date to become its Yajman. Dates with a confirmed Yajman are shown in orange and cannot be selected.
          </Text>

          <TouchableOpacity
            style={styles.calendarToggle}
            onPress={() => setShowCalendar((v) => !v)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="event" size={18} color="#B97512" />
            <Text style={[styles.calendarToggleText, { color: '#B97512' }]}>
              {selectedIso ? formattedSelected : 'Open Calendar to Select Katha Date'}
            </Text>
            <MaterialIcons
              name={showCalendar ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={22}
              color="#B97512"
            />
          </TouchableOpacity>

          {showCalendar && (
            <View style={styles.calendarBox}>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <MaterialIcons name="chevron-left" size={24} color="#8B5A00" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <MaterialIcons name="chevron-right" size={24} color="#8B5A00" />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAYS.map((d) => (
                  <Text key={d} style={styles.weekDay}>{d}</Text>
                ))}
              </View>

              {/* Grid */}
              {loadingMonth ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator color="#8B5A00" />
                </View>
              ) : (
                <View style={styles.grid}>
                  {cells.map((date, i) => {
                    if (!date) return <View key={`empty-${i}`} style={styles.cell} />
                    const iso = toIso(date)
                    const past = isPast(date)
                    const selected = iso === selectedIso
                    const dayInfo = monthlyAvailability[iso]
                    const booked = past ? false : (dayInfo ? !dayInfo.available : false)
                    const dotColor = past ? '#C04545' : booked ? '#E65C00' : '#2F7132'
                    return (
                      <TouchableOpacity
                        key={iso}
                        style={[
                          styles.cell,
                          selected && styles.cellSelected,
                          (past || booked) && styles.cellPast,
                        ]}
                        disabled={past || booked}
                        onPress={() => void onSelectDate(date)}
                        activeOpacity={0.75}
                      >
                        <Text style={[
                          styles.cellText,
                          selected && styles.cellTextSelected,
                          (past || booked) && styles.cellTextPast,
                        ]}>
                          {date.getDate()}
                        </Text>
                        <View style={[styles.bookedDot, { backgroundColor: selected ? '#fff' : dotColor }]} />
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2F7132' }]} />
                  <Text style={styles.legendText}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#E65C00' }]} />
                  <Text style={styles.legendText}>Already Reserved</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#7E57C2' }]} />
                  <Text style={styles.legendText}>Waiting List</Text>
                </View>
              </View>
            </View>
          )}

          {checking ? (
            <View style={styles.availRow}>
              <ActivityIndicator size="small" color="#B97512" />
              <Text style={styles.availChecking}>Checking Katha schedule…</Text>
            </View>
          ) : availabilityMsg ? (
            <View style={[styles.availRow, availabilityMsg.available ? styles.availOk : styles.availNo]}>
              <MaterialIcons
                name={availabilityMsg.available ? 'check-circle' : 'cancel'}
                size={16}
                color={availabilityMsg.available ? '#2F7132' : '#C04545'}
              />
              <Text style={[styles.availText, { color: availabilityMsg.available ? '#2F7132' : '#C04545' }]}>
                {availabilityMsg.available
                  ? `Yajman position is open for ${formattedSelected}. You can book it.`
                  : availabilityMsg.reason ?? 'A Yajman is already confirmed for this Katha.'}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Become Yajman CTA */}
        {selectedIso && availabilityMsg?.available ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.sponsorPreview}>
              <MaterialIcons name="local-fire-department" size={18} color="#B97512" />
              <Text style={styles.sponsorPreviewText}>
                You will become the Yajman for the Katha on{' '}
                <Text style={styles.sponsorPreviewDate}>{formattedSelected}</Text>
              </Text>
            </View>
            <Pressable onPress={onContinue}>
              <LinearGradient
                colors={['#4A2E00', '#8B5A00', '#C4892B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>Become Today's Yajman →</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable disabled>
            <LinearGradient colors={['#D5CFC8', '#D5CFC8']} style={styles.ctaButton}>
              <Text style={styles.ctaText}>Select a Katha Date to Continue</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Spiritual note */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "The opportunity to perform the Guru's Aarti is not merely an act — it is the culmination of many lifetimes of devotion."
          </Text>
          <Text style={styles.quoteSource}>— Ashram Teaching</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 56, gap: 20 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F0E7DD',
  },
  kicker: { color: '#B97512', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2B231B', fontSize: 26, fontWeight: '900', marginTop: 2 },

  heroBanner: { borderRadius: 24, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  heroIconRing: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.90)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroTextWrap: { flex: 1, gap: 6 },
  heroBannerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  heroBannerBody: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 20 },
  heroPricePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroPriceText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: '#F0E7DD', gap: 10,
  },
  sectionTitle: { color: '#2B231B', fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { color: '#7E7162', fontSize: 13, lineHeight: 20 },
  sectionBody: { color: '#4F4337', fontSize: 14, lineHeight: 22 },
  sectionBold: { fontWeight: '900', color: '#B97512' },

  stepsHeading: { color: '#2B231B', fontSize: 17, fontWeight: '900', marginLeft: 2 },
  stepRow: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F0E7DD',
  },
  stepNumberWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumber: { color: '#B97512', fontSize: 14, fontWeight: '900' },
  stepText: { flex: 1, gap: 3 },
  stepTitle: { color: '#2B231B', fontSize: 14, fontWeight: '800' },
  stepBody: { color: '#7E7162', fontSize: 13, lineHeight: 20 },

  calendarToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF9F0', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#EDD9B8',
  },
  calendarToggleText: { flex: 1, fontSize: 14, fontWeight: '700' },

  calendarBox: { marginTop: 12, gap: 8 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { color: '#2B231B', fontSize: 16, fontWeight: '800' },
  weekRow: { flexDirection: 'row', marginTop: 4 },
  weekDay: { flex: 1, textAlign: 'center', color: '#9E9080', fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`, height: 44,
    alignItems: 'center', justifyContent: 'center', borderRadius: 10,
  },
  cellSelected: { backgroundColor: '#B97512' },
  cellPast: { opacity: 0.35 },
  cellBooked: { backgroundColor: 'rgba(230,92,0,0.12)' },
  cellText: { color: '#2B231B', fontSize: 15, fontWeight: '600' },
  cellTextSelected: { color: '#fff', fontWeight: '900' },
  cellTextPast: { color: '#B9B1A9' },
  cellTextBooked: { color: '#E65C00', fontWeight: '800' },
  bookedDot: {
    position: 'absolute', bottom: 4,
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#E65C00',
  },
  legendRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#9E9080', fontSize: 11, fontWeight: '600' },

  availRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 10, borderRadius: 14, padding: 12,
  },
  availOk: { backgroundColor: '#EEF8EF' },
  availNo: { backgroundColor: '#FDECEA' },
  availChecking: { color: '#9E9080', fontSize: 13, fontWeight: '600' },
  availText: { fontSize: 13, fontWeight: '700', flex: 1, lineHeight: 20 },

  sponsorPreview: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF0D9', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#EDD9B8', marginBottom: 10,
  },
  sponsorPreviewText: { color: '#7E7162', fontSize: 13, lineHeight: 20, flex: 1 },
  sponsorPreviewDate: { color: '#B97512', fontWeight: '900' },

  ctaButton: { minHeight: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  quoteCard: {
    backgroundColor: 'rgba(216,155,29,0.08)', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(216,155,29,0.18)', gap: 6,
  },
  quoteText: { color: '#5A4A42', fontSize: 14, lineHeight: 22, fontStyle: 'italic', textAlign: 'center' },
  quoteSource: { color: '#9E9080', fontSize: 12, fontWeight: '700', textAlign: 'center' },
})
