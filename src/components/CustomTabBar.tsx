import React from 'react'
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

/* ─── Design tokens (from reference image analysis) ─── */
const COLORS = {
  active: '#B8860B',
  inactive: '#9CA3AF',
  barBg: '#FFFFFF',
  btnGradientStart: '#C4892B',
  btnGradientEnd: '#A06E1D',
}

/* ─── Dimensions (measured from reference) ─── */
const TAB_BAR_HEIGHT = 70 // visible bar height
const BUTTON_SIZE = 62 // donate circle diameter
const BUTTON_RING = 5 // white ring around circle
const BUTTON_OUTER = BUTTON_SIZE + BUTTON_RING * 2 // 72
const NOTCH_WIDTH = 88 // total width of the concave notch
const NOTCH_DEPTH = 48 // how deep the notch goes from top of the SVG
const NOTCH_RADIUS = NOTCH_WIDTH / 2 // half-width for curve calculations
const NOTCH_GAP = 6 // spacing between button edge and notch curve
const CORNER_RADIUS = 24 // top-left / top-right corner radius
const ICON_SIZE = 22
const LABEL_SIZE = 11

// Button protrudes ~65% above bar. The SVG canvas needs extra height for the notch.
const BUTTON_ABOVE = BUTTON_OUTER * 0.65
const SVG_EXTRA = BUTTON_ABOVE // extra SVG height above the bar for the notch
const SVG_HEIGHT = TAB_BAR_HEIGHT + SVG_EXTRA
const SCREEN_W = Dimensions.get('window').width

/* ─── Tab definitions ─── */
const LEFT_TABS = [
  { name: 'home', label: 'Home', icon: 'home-filled' as const, href: '/(tabs)/home' as const },
  { name: 'travel', label: 'Travel', icon: 'explore' as const, href: '/(tabs)/travel' as const },
]
const RIGHT_TABS = [
  { name: 'notifications', label: 'Alerts', icon: 'notifications-none' as const, href: '/(tabs)/notifications' as const },
  { name: 'profile', label: 'Profile', icon: 'person-outline' as const, href: '/(tabs)/profile' as const },
]

/* ─── Generate the notched SVG path ─── */
function getTabBarPath(width: number, height: number): string {
  const cx = width / 2 // center x
  const barTop = SVG_EXTRA // y where the flat top-edge of the bar sits
  const notchBottom = barTop + NOTCH_DEPTH // deepest point of the notch
  const notchLeft = cx - NOTCH_RADIUS
  const notchRight = cx + NOTCH_RADIUS

  // Bezier control offset for smooth concave curve
  const curveHandle = NOTCH_RADIUS * 0.55

  return [
    // Start at bottom-left
    `M 0 ${height}`,
    // Up to top-left, accounting for corner radius
    `L 0 ${barTop + CORNER_RADIUS}`,
    // Top-left rounded corner
    `Q 0 ${barTop} ${CORNER_RADIUS} ${barTop}`,
    // Straight across to the left edge of the notch
    `L ${notchLeft} ${barTop}`,
    // Concave notch: left curve down
    `C ${notchLeft + curveHandle} ${barTop} ${cx - curveHandle} ${notchBottom} ${cx} ${notchBottom}`,
    // Concave notch: right curve up
    `C ${cx + curveHandle} ${notchBottom} ${notchRight - curveHandle} ${barTop} ${notchRight} ${barTop}`,
    // Straight across to the right edge, accounting for corner radius
    `L ${width - CORNER_RADIUS} ${barTop}`,
    // Top-right rounded corner
    `Q ${width} ${barTop} ${width} ${barTop + CORNER_RADIUS}`,
    // Down to bottom-right
    `L ${width} ${height}`,
    // Close path
    'Z',
  ].join(' ')
}

/* ─── Props type ─── */
type CustomTabBarProps = {
  state: {
    index: number
    routes: Array<{ name: string }>
  }
  navigation: {
    navigate: (name: string) => void
  }
}

/* ────────────────────────────────────────────────────────────── */
/*  CustomTabBar                                                  */
/* ────────────────────────────────────────────────────────────── */
export default function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()
  const bottomPadding = Math.max(insets.bottom, 8)
  const totalHeight = SVG_HEIGHT + bottomPadding

  // Hide tab bar during travel and seva booking / payment / history flows
  const shouldHideTabBar =
    pathname === '/travel/booking' ||
    pathname.startsWith('/travel/booking/') ||
    pathname.startsWith('/travel/booking-status/') ||
    pathname.startsWith('/travel/payment') ||
    pathname.startsWith('/travel/success') ||
    pathname.includes('/seva-payment') ||
    pathname.includes('/seva-success') ||
    pathname.includes('/seva/annadan') ||
    pathname.includes('/seva/yajman') ||
    pathname.includes('/my-sevas')

  if (shouldHideTabBar) {
    return null
  }

  const svgPath = getTabBarPath(SCREEN_W, SVG_HEIGHT)

  const renderTab = (item: { name: string; label: string; icon: string; href: string }) => {
    const routeIndex = state.routes.findIndex((r) => r.name === item.name)
    const focused = state.index === routeIndex
    const color = focused ? COLORS.active : COLORS.inactive

    return (
      <Pressable
        key={item.name}
        onPress={() => router.navigate(item.href as never)}
        style={styles.tabButton}
      >
        <MaterialIcons name={item.icon as any} size={ICON_SIZE} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{item.label}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* SVG background with notch */}
      <View style={styles.svgWrap}>
        <Svg width={SCREEN_W} height={SVG_HEIGHT} style={styles.svg}>
          <Path
            d={svgPath}
            fill={COLORS.barBg}
          />
        </Svg>
      </View>

      {/* Donate button — positioned in the notch */}
      <View style={styles.buttonAnchor} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push('/donation' as never)}
          style={styles.buttonRing}
        >
          <LinearGradient
            colors={[COLORS.btnGradientStart, COLORS.btnGradientEnd]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={styles.buttonCircle}
          >
            <MaterialIcons name="volunteer-activism" size={26} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Tab icons row — positioned inside the bar area */}
      <View style={[styles.tabRow, { bottom: bottomPadding }]}>
        {LEFT_TABS.map(renderTab)}

        {/* Center spacer for the donate button */}
        <View style={styles.centerSpacer} />

        {RIGHT_TABS.map(renderTab)}
      </View>

      {/* Safe area fill at the bottom */}
      <View style={[styles.safeAreaFill, { height: bottomPadding }]} />
    </View>
  )
}

/* ────────────────────────────────────────────────────────────── */
/*  Styles                                                        */
/* ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  svgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  svg: {
    // Android elevation needs a background to cast shadow
    ...Platform.select({
      android: {
        backgroundColor: 'transparent',
      },
    }),
  },
  /* Donate button */
  buttonAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // Position the button center at the notch center
    // The notch bottom is at SVG_EXTRA + NOTCH_DEPTH
    // The button center should be near the bar top edge
    transform: [{ translateY: SVG_EXTRA - BUTTON_OUTER * 0.35 }],
  },
  buttonRing: {
    width: BUTTON_OUTER,
    height: BUTTON_OUTER,
    borderRadius: BUTTON_OUTER / 2,
    backgroundColor: COLORS.barBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#5b4636',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  buttonCircle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Tab row */
  tabRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: LABEL_SIZE,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  centerSpacer: {
    width: NOTCH_WIDTH + 8,
  },
  /* Safe area bottom fill */
  safeAreaFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.barBg,
  },
})
