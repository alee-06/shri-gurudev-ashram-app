import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, interpolate, useAnimatedScrollHandler } from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { profileData, upcomingYatrasMock, savedEventsMock, donationCategoriesMock } from '../../services/profileMockData';
import { MainTabParamList } from '../../navigators/MainTabNavigator';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const COLORS = {
  background: '#FAF6F0',
  ivory: '#FCFAF6',
  surface: '#ffffff',
  primary: '#E65C00',
  primaryDark: '#993D00',
  primaryLight: '#FF9933',
  text: '#2B231B',
  muted: '#7E7162',
  border: '#F0E7DD',
  gold: '#B97512',
  warmSurface: '#FFF9F0',
};

type ProfileNav = {
  navigate: (name: keyof MainTabParamList) => void;
  getParent?: () => {
    navigate: (name: string) => void;
  };
};

function QuickActionCard({ icon, label, onPress, delay }: { icon: any; label: string; onPress: () => void; delay: number }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      entering={FadeInDown.delay(delay).duration(400)}
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.95); }}
      onPressOut={() => { scale.value = withTiming(1); }}
      style={[styles.quickActionCard, animatedStyle]}
    >
      <View style={styles.quickActionIcon}>
        <MaterialIcons name={icon} size={24} color={COLORS.primaryDark} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

function SettingsRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  const bg = useSharedValue('transparent');
  const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { bg.value = withTiming('rgba(0,0,0,0.03)'); }}
      onPressOut={() => { bg.value = withTiming('transparent'); }}
      style={[styles.settingsRow, animatedStyle]}
    >
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon} size={22} color={COLORS.muted} />
        <Text style={styles.settingsRowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
    </AnimatedPressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileNav>();
  const parentNavigation = navigation.getParent?.();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isCollector = user?.role === 'collector';

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 80], [1, 0]),
      transform: [{ translateY: interpolate(scrollY.value, [0, 80], [0, -20]) }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Dynamic Header */}
        <Animated.View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }, headerStyle]}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Jai Gurudev</Text>
              <Text style={styles.name}>{user?.name || 'Devotee'}</Text>
            </View>
          </View>
          <Pressable style={styles.bellIcon}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            <View style={styles.bellBadge} />
          </Pressable>
        </Animated.View>

        <View style={styles.contentPadding}>
          {/* Hero Card */}
          <Animated.View entering={FadeInUp.duration(500)} style={styles.heroCardWrap}>
            <LinearGradient
              colors={['#ffffff', '#FCFAF6']}
              style={styles.heroCard}
            >
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.memberId}>ID: SD-99281</Text>
                  <Text style={styles.memberSince}>Member since {profileData.memberSince}</Text>
                </View>
                <View style={styles.heroBadge}>
                  <MaterialIcons name="verified" size={16} color={COLORS.gold} />
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{profileData.completedYatras}</Text>
                  <Text style={styles.heroStatLabel}>Completed Yatras</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{profileData.upcomingYatras}</Text>
                  <Text style={styles.heroStatLabel}>Upcoming Yatras</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            <QuickActionCard icon="event-note" label="My Bookings" delay={100} onPress={() => navigation.navigate('Travel')} />
            <QuickActionCard icon="volunteer-activism" label="Donations" delay={200} onPress={() => {}} />
            <QuickActionCard icon="map" label="Sacred Routes" delay={300} onPress={() => {}} />
            <QuickActionCard icon="headset-mic" label="Support" delay={400} onPress={() => {}} />
          </View>

          {/* My Yatras Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Yatras</Text>
              <Pressable onPress={() => navigation.navigate('Travel')}><Text style={styles.seeAll}>See All</Text></Pressable>
            </View>
            {upcomingYatrasMock.map((yatra) => (
              <Animated.View key={yatra.id} entering={FadeInDown.duration(400)} style={styles.yatraCard}>
                <Image source={{ uri: yatra.image }} style={styles.yatraImage} contentFit="cover" />
                <View style={styles.yatraDetails}>
                  <View style={styles.yatraStatusBadge}>
                    <Text style={styles.yatraStatusText}>{yatra.status}</Text>
                  </View>
                  <Text style={styles.yatraDestination}>{yatra.destination}</Text>
                  <Text style={styles.yatraDate}>{yatra.date}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Spiritual Progress & Donations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spiritual Contributions</Text>
            <View style={styles.donationsGrid}>
              <View style={[styles.donationBox, { backgroundColor: COLORS.warmSurface }]}>
                <MaterialIcons name="volunteer-activism" size={20} color={COLORS.primary} style={{ marginBottom: 8 }} />
                <Text style={styles.donationAmount}>{profileData.totalDonations}</Text>
                <Text style={styles.donationLabel}>Total Donated</Text>
              </View>
              <View style={styles.donationBoxList}>
                {donationCategoriesMock.map((cat) => (
                  <View key={cat.id} style={styles.donationCatRow}>
                    <Text style={styles.donationCatTitle}>{cat.title}</Text>
                    <Text style={styles.donationCatAmount}>{cat.amount}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Saved Events */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Events</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
              {savedEventsMock.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Image source={{ uri: event.image }} style={styles.eventImage} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.eventGradient}>
                    <Text style={styles.eventDate}>{event.date}</Text>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                  </LinearGradient>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Collector Access */}
          {isCollector && (
            <AnimatedPressable entering={FadeInUp} onPress={() => parentNavigation?.navigate('CollectorDashboard')} style={styles.collectorCard}>
              <LinearGradient colors={['#993D00', '#E65C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.collectorGradient}>
                <View style={styles.collectorContent}>
                  <MaterialIcons name="admin-panel-settings" size={28} color="#fff" />
                  <View style={styles.collectorTextWrap}>
                    <Text style={styles.collectorTitle}>Collector Dashboard</Text>
                    <Text style={styles.collectorSubtitle}>Manage bookings and verifications</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </AnimatedPressable>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.settingsCard}>
              <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => {}} />
              <View style={styles.settingsDivider} />
              <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
              <View style={styles.settingsDivider} />
              <SettingsRow icon="globe-outline" label="Language" onPress={() => {}} />
              <View style={styles.settingsDivider} />
              <SettingsRow icon="help-circle-outline" label="Help & Support" onPress={() => parentNavigation?.navigate('HelpSupport')} />
              <View style={styles.settingsDivider} />
              <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => {}} />
              <View style={styles.settingsDivider} />
              <SettingsRow icon="shield-checkmark-outline" label="Terms & Conditions" onPress={() => {}} />
            </View>
          </View>

          {/* Logout */}
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.ivory,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  greeting: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  bellIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  contentPadding: {
    paddingHorizontal: 24,
  },
  heroCardWrap: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 24,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  memberId: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: COLORS.muted,
  },
  heroBadge: {
    backgroundColor: '#FFF8F0',
    padding: 8,
    borderRadius: 12,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  quickActionCard: {
    alignItems: 'center',
    width: '23%',
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  yatraCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  yatraImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  yatraDetails: {
    flex: 1,
    marginLeft: 16,
  },
  yatraStatusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  yatraStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
  },
  yatraDestination: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  yatraDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  warmSurface: {
    backgroundColor: '#FFF9F0',
  },
  donationsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  donationBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FBEAD5',
  },
  donationAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  donationLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  donationBoxList: {
    flex: 1.2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  donationCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  donationCatTitle: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  donationCatAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventsScroll: {
    gap: 16,
  },
  eventCard: {
    width: 200,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventImage: {
    ...StyleSheet.absoluteFill,
  },
  eventGradient: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: 16,
  },
  eventDate: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 20,
  },
  collectorCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  collectorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  collectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  collectorTextWrap: {
    flex: 1,
  },
  collectorTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  collectorSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
  logoutButton: {
    backgroundColor: '#FFEFE5',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD5B8',
  },
  logoutText: {
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
});
