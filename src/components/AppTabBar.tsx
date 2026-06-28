import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

const COLORS = {
  active: '#B8860B',
  inactive: '#9CA3AF',
  barBg: '#FDFBF7',
}

/* ─── Dimensions ─── */
// Tab bar visible height (excluding safe-area)
const TAB_BAR_HEIGHT = 58
// The donate circle is large enough to hold icon + "Donate" label inside
const DONATE_SIZE = 68
const DONATE_RING = 4 // white ring around gradient circle
const DONATE_OUTER = DONATE_SIZE + DONATE_RING * 2 // 76
// 70 % of the circle sits above the bar top-edge
const DONATE_ABOVE = DONATE_OUTER * 0.7 // ~53

const LEFT_TABS = [
  { name: 'home', label: 'Home', icon: 'home-filled' as const, href: '/(tabs)/home' as const },
  { name: 'travel', label: 'Travel', icon: 'explore' as const, href: '/(tabs)/travel' as const },
]

const RIGHT_TABS = [
  { name: 'notifications', label: 'Alerts', icon: 'notifications-none' as const, href: '/(tabs)/notifications' as const },
  { name: 'profile', label: 'Profile', icon: 'person-outline' as const, href: '/(tabs)/profile' as const },
]

type AppTabBarProps = {
  state: {
    index: number
    routes: Array<{ name: string }>
  }
  navigation: {
    navigate: (name: string) => void
  }
}

export default function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const bottomPadding = Math.max(insets.bottom, 8)

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
        <MaterialIcons name={item.icon as any} size={24} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{item.label}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
      <View style={styles.barContainer}>
        {/* ── Tab row ── */}
        <View style={[styles.bar, { height: TAB_BAR_HEIGHT }]}>
          {LEFT_TABS.map(renderTab)}

          {/* Spacer for the donate circle */}
          <View style={styles.centerSpacer} />

          {RIGHT_TABS.map(renderTab)}
        </View>

        {/* ── Donate circle — positioned relative to barContainer ── */}
        <View style={styles.donateAnchor} pointerEvents="box-none">
          <Pressable
            onPress={() => router.push('/donation' as never)}
            style={styles.donateRing}
          >
            <LinearGradient
              colors={['#D49A2A', '#C4892B', '#B07518']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.donateCircle}
            >
              <MaterialIcons name="volunteer-activism" size={24} color="#fff" />
              <Text style={styles.donateLabel}>Donate</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* ── Wrapper ── */
  wrapper: {
    backgroundColor: COLORS.barBg,
  },

  /* ── Bar container — relative positioning anchor ── */
  barContainer: {
    position: 'relative',
  },

  /* ── Tab row ── */
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.barBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
      },
      android: {
        elevation: 6,
      },
    }),
  },

  /* ── Individual tab ── */
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  /* ── Center spacer ── */
  centerSpacer: {
    width: DONATE_OUTER + 8, // 84
  },

  /* ── Donate anchor ── */
  donateAnchor: {
    position: 'absolute',
    top: -DONATE_ABOVE,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  /* ── White ring ── */
  donateRing: {
    width: DONATE_OUTER,
    height: DONATE_OUTER,
    borderRadius: DONATE_OUTER / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#5b4636',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 10,
      },
    }),
  },

  /* ── Gradient circle ── */
  donateCircle: {
    width: DONATE_SIZE,
    height: DONATE_SIZE,
    borderRadius: DONATE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },

  /* ── "Donate" label INSIDE the circle ── */
  donateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginTop: -1,
  },
})
