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
import { checkAnnadanAvailability, fetchSevaPricing, fetchSevaMonthlyAvailability, DateAvailabilityInfo } from '../../../../src/services/seva'

// ─── Month helpers ────────────────────────────────────────────────────────────
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

// ─── What Annadan means ───────────────────────────────────────────────────────
const ANNADAN_STEPS = [
  { icon: 'restaurant', title: 'Mahaprasad is prepared', body: 'The Ashram kitchen prepares a full Mahaprasad meal for every devotee who visits that day — hundreds of plates.' },
  { icon: 'favorite', title: 'Your name is honoured', body: 'The Annadan is announced in your name (or your family\'s name) during the day\'s aarti.' },
  { icon: 'volunteer-activism', title: 'Every visitor is fed', body: 'No devotee goes hungry. Your donation ensures everyone receives prasad with Guruji\'s blessings.' },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function AnnadanCalendarRoute() {
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
  const [annadanPrice, setAnnadanPrice] = useState<number>(2100)
  const [monthlyAvailability, setMonthlyAvailability] = useState<Record<string, DateAvailabilityInfo>>({})
  const [loadingMonth, setLoadingMonth] = useState(false)

  useEffect(() => {
    fetchSevaPricing().then((p) => { if (p?.annadan) setAnnadanPrice(p.annadan) }).catch(() => {})
    resetSeva()
    setSevaType('annadan')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    setLoadingMonth(true)
    fetchSevaMonthlyAvailability('annadan', monthStr)
      .then((map) => setMonthlyAvailability(map))
      .catch((e) => console.error('Failed to load Annadan month availability:', e))
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
      const result = await checkAnnadanAvailability(iso)
      setAvailabilityMsg(result)
    } finally {
      setChecking(false)
    }
  }

  const onContinue = () => {
    if (!selectedIso || !availabilityMsg?.available) return
    setSelectedDate(selectedIso)
    router.push('/(tabs)/seva/annadan/details' as never)
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
            <Text style={styles.kicker}>Sponsor a Day</Text>
            <Text style={styles.title}>Annadan Seva</Text>
          </View>
        </View>

        {/* Hero Banner */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={['#7B4B00', '#B97512', '#E0A31F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroIconRing}>
              <MaterialIcons name="restaurant" size={32} color="#8B5A00" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroBannerTitle}>Mahaprasad Seva</Text>
              <Text style={styles.heroBannerBody}>
                Sponsor one full day's Mahaprasad for all devotees visiting Shri Gurudev Ashram.
              </Text>
              <View style={styles.heroPricePill}>
                <Text style={styles.heroPriceText}>₹{annadanPrice.toLocaleString('en-IN')} · Full Day Sponsorship</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* What is Annadan? */}
        <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What is Annadan?</Text>
          <Text style={styles.sectionBody}>
            <Text style={styles.sectionBold}>Annadan</Text> means the gift of food. Every day at Shri Gurudev Ashram, hundreds of devotees receive Mahaprasad — food prepared with devotion and offered to the Lord before being served.
          </Text>
          <Text style={styles.sectionBody}>
            When you sponsor a day's Annadan, you become the <Text style={styles.sectionBold}>sole patron</Text> of that day's Mahaprasad. The seva is performed in your name or your family's name.
          </Text>
        </Animated.View>

        {/* What happens on your day */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <Text style={styles.stepsHeading}>On Your Sponsored Day</Text>
          {ANNADAN_STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIconWrap}>
                <MaterialIcons name={step.icon as any} size={20} color="#8B5A00" />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Select Date */}
        <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Select Annadan Date</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a date to sponsor. Each date can only have one patron. Dates marked as booked are already sponsored.
          </Text>

          {/* Toggle Calendar */}
          <TouchableOpacity
            style={styles.calendarToggle}
            onPress={() => setShowCalendar((v) => !v)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="event" size={18} color="#8B5A00" />
            <Text style={styles.calendarToggleText}>
              {selectedIso ? formattedSelected : 'Open Calendar to Select Date'}
            </Text>
            <MaterialIcons
              name={showCalendar ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={22}
              color="#8B5A00"
            />
          </TouchableOpacity>

          {showCalendar && (
            <View style={styles.calendarBox}>
              {/* Month nav */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <MaterialIcons name="chevron-left" size={24} color="#8B5A00" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <MaterialIcons name="chevron-right" size={24} color="#8B5A00" />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
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
                    const dotColor = past ? '#C04545' : booked ? '#F5C242' : '#2F7132'
                    return (
                      <TouchableOpacity
                        key={iso}
                        style={[
                          styles.cell,
                          selected && styles.cellSelected,
                          (past || booked) && styles.cellPast,
                          booked && !past && styles.cellBooked,
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

              {/* Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2F7132' }]} />
                  <Text style={styles.legendText}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F5C242' }]} />
                  <Text style={styles.legendText}>Already Sponsored</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#C04545' }]} />
                  <Text style={styles.legendText}>Closed</Text>
                </View>
              </View>
            </View>
          )}

          {/* Availability result */}
          {checking ? (
            <View style={styles.availRow}>
              <ActivityIndicator size="small" color="#B97512" />
              <Text style={styles.availChecking}>Checking availability…</Text>
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
                  ? `${formattedSelected} is available. You can sponsor this day.`
                  : availabilityMsg.reason ?? 'This date is not available.'}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Sponsor CTA */}
        {selectedIso && availabilityMsg?.available ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.sponsorPreview}>
              <MaterialIcons name="volunteer-activism" size={18} color="#8B5A00" />
              <Text style={styles.sponsorPreviewText}>
                You are sponsoring Annadan on{' '}
                <Text style={styles.sponsorPreviewDate}>{formattedSelected}</Text>
              </Text>
            </View>
            <Pressable onPress={onContinue}>
              <LinearGradient
                colors={['#7B4B00', '#B97512', '#E0A31F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>Sponsor This Day →</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable disabled>
            <LinearGradient
              colors={['#D5CFC8', '#D5CFC8']}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Select a Date to Sponsor</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Gurudev quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "Annadan is the highest dana. He who feeds the hungry earns the merit of all other danas combined."
          </Text>
          <Text style={styles.quoteSource}>— Shrimad Bhagavatam</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 56, gap: 20 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F0E7DD',
  },
  kicker: { color: '#E65C00', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#2B231B', fontSize: 26, fontWeight: '900', marginTop: 2 },

  // Hero banner
  heroBanner: {
    borderRadius: 24, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'flex-start',
  },
  heroIconRing: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.90)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroTextWrap: { flex: 1, gap: 6 },
  heroBannerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  heroBannerBody: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 20 },
  heroPricePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroPriceText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Section card
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: '#F0E7DD', gap: 10,
  },
  sectionTitle: { color: '#2B231B', fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { color: '#7E7162', fontSize: 13, lineHeight: 20 },
  sectionBody: { color: '#4F4337', fontSize: 14, lineHeight: 22 },
  sectionBold: { fontWeight: '900', color: '#8B5A00' },

  // Steps
  stepsHeading: { color: '#2B231B', fontSize: 17, fontWeight: '900', marginLeft: 2 },
  stepRow: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F0E7DD',
  },
  stepIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepText: { flex: 1, gap: 3 },
  stepTitle: { color: '#2B231B', fontSize: 14, fontWeight: '800' },
  stepBody: { color: '#7E7162', fontSize: 13, lineHeight: 20 },

  // Calendar toggle
  calendarToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF9F0', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#EDD9B8',
  },
  calendarToggleText: { flex: 1, color: '#8B5A00', fontSize: 14, fontWeight: '700' },

  // Calendar box
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
  cellSelected: { backgroundColor: '#8B5A00' },
  cellPast: { opacity: 0.35 },
  cellBooked: { opacity: 1 },
  cellText: { color: '#2B231B', fontSize: 15, fontWeight: '600' },
  cellTextSelected: { color: '#fff', fontWeight: '900' },
  cellTextPast: { color: '#B9B1A9' },
  bookedDot: {
    position: 'absolute', bottom: 4,
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F5C242',
  },
  legendRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#9E9080', fontSize: 11, fontWeight: '600' },

  // Availability
  availRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 10, borderRadius: 14, padding: 12,
  },
  availOk: { backgroundColor: '#EEF8EF' },
  availNo: { backgroundColor: '#FDECEA' },
  availChecking: { color: '#9E9080', fontSize: 13, fontWeight: '600' },
  availText: { fontSize: 13, fontWeight: '700', flex: 1, lineHeight: 20 },

  // Sponsor preview
  sponsorPreview: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF0D9', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#EDD9B8', marginBottom: 10,
  },
  sponsorPreviewText: { color: '#7E7162', fontSize: 13, lineHeight: 20, flex: 1 },
  sponsorPreviewDate: { color: '#8B5A00', fontWeight: '900' },

  // CTA
  ctaButton: { minHeight: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Quote
  quoteCard: {
    backgroundColor: 'rgba(216,155,29,0.08)', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(216,155,29,0.18)', gap: 6,
  },
  quoteText: { color: '#5A4A42', fontSize: 14, lineHeight: 22, fontStyle: 'italic', textAlign: 'center' },
  quoteSource: { color: '#9E9080', fontSize: 12, fontWeight: '700', textAlign: 'center' },
})
