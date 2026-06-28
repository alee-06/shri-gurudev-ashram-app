import React from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { signOut } from '../../src/services/auth'
import { getCurrentProfileInfo, getCurrentUserYatraStats, softDeleteCurrentUser, type ProfileInfo, type YatraStats } from '../../src/services/profile'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useBookingDraftStore } from '../../src/store/useBookingDraftStore'

const SUPPORT_CONFIG = {
  phone: '+91-XXXXXXXXXX',
  whatsapp: '+91-XXXXXXXXXX',
  email: 'support@example.com',
}

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name']
type IonIconName = React.ComponentProps<typeof Ionicons>['name']

const EMPTY_STATS: YatraStats = {
  totalBookings: 0,
  upcomingYatras: 0,
  completedYatras: 0,
  pendingPayments: 0,
}

export default function ProfileRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const storeUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const resetDraft = useBookingDraftStore((state) => state.resetDraft)
  const clearAadhaar = useAuthStore((state) => state.setAadhaarNumber)
  const clearTemporaryAadhaarUri = useAuthStore((state) => state.setTemporaryAadhaarUri)
  const clearTemporarySelfieUri = useAuthStore((state) => state.setTemporarySelfieUri)
  const [profile, setProfile] = React.useState<ProfileInfo | null>(null)
  const [stats, setStats] = React.useState<YatraStats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const isCollector = storeUser?.role === 'collector'

  const loadProfile = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setErrorMessage('')

    try {
      const [profileInfo, yatraStats] = await Promise.all([
        getCurrentProfileInfo(),
        getCurrentUserYatraStats(),
      ])
      setProfile(profileInfo)
      setStats(yatraStats)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load your profile right now.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const clearLocalSession = React.useCallback(() => {
    logout()
    resetDraft()
    clearAadhaar('')
    clearTemporaryAadhaarUri(null)
    clearTemporarySelfieUri(null)
  }, [clearAadhaar, clearTemporaryAadhaarUri, clearTemporarySelfieUri, logout, resetDraft])

  const handleLogout = async () => {
    try {
      await signOut()
      clearLocalSession()
      router.replace('/(auth)/splash' as never)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not log out right now.')
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setErrorMessage('')

    try {
      await softDeleteCurrentUser()
      await signOut()
      clearLocalSession()
      setShowDeleteConfirm(false)
      router.replace('/(auth)/splash' as never)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete your account right now.')
    } finally {
      setIsDeleting(false)
    }
  }

  const openSupportLink = async (url: string) => {
    try {
      await Linking.openURL(url)
    } catch {
      setErrorMessage('Could not open this support option on your device.')
    }
  }

  const displayProfile = profile ?? {
    id: storeUser?.id ?? '',
    fullName: storeUser?.fullName ?? 'Devotee',
    email: storeUser?.email ?? null,
    phone: storeUser?.phone ?? '',
    memberSince: '',
    profileImageUrl: storeUser?.profileImageUrl ?? null,
    aadhaarNumber: storeUser?.aadhaarNumber ?? null,
    verificationStatus: storeUser?.verificationStatus ?? 'not_submitted',
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadProfile(true)} />}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={styles.header}>
          <Avatar profile={displayProfile} />
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Jai Gurudev</Text>
            <Text style={styles.name}>{displayProfile.fullName || 'Devotee'}</Text>
          </View>
          <Pressable style={styles.bellIcon} onPress={() => router.push('/(tabs)/notifications' as never)}>
            <Ionicons name="notifications-outline" size={24} color="#2B231B" />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#8B5A00" />
            <Text style={styles.stateText}>Loading your profile</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.inlineError}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadProfile()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <LinearGradient colors={['#ffffff', '#FCFAF6']} style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileCopy}>
              <ProfileInfoRow icon="mail-outline" value={displayProfile.email ?? 'Email unavailable'} />
              <ProfileInfoRow icon="call-outline" value={displayProfile.phone || 'Phone unavailable'} />
              <ProfileInfoRow icon="calendar-outline" value={`Member since: ${formatMonthYear(displayProfile.memberSince)}`} />
            </View>
            <Pressable style={styles.editButton} onPress={() => router.push('/edit-profile' as never)}>
              <MaterialIcons name="edit" size={18} color="#993D00" />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>
          <VerificationBadge status={displayProfile.verificationStatus} onPress={() => router.push('/verify-identity' as never)} />
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Yatras</Text>
            <Pressable onPress={() => router.push('/(tabs)/travel/booking-history' as never)}>
              <Text style={styles.seeAll}>My Bookings</Text>
            </Pressable>
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon="confirmation-number" label="Total Bookings" value={stats.totalBookings} />
            <StatCard icon="event-available" label="Upcoming Yatras" value={stats.upcomingYatras} />
            <StatCard icon="verified" label="Completed Yatras" value={stats.completedYatras} />
            <StatCard icon="payments" label="Pending Payments" value={stats.pendingPayments} />
          </View>
          {stats.totalBookings === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>Your yatra booking summary will appear here once you book from Supabase.</Text>
            </View>
          ) : null}
          <Pressable style={styles.bookingsShortcut} onPress={() => router.push('/(tabs)/travel/booking-history' as never)}>
            <MaterialIcons name="event-note" size={22} color="#993D00" />
            <Text style={styles.bookingsShortcutText}>My Bookings</Text>
            <MaterialIcons name="chevron-right" size={22} color="#D7C7B8" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.settingsCard}>
            <SettingsRow icon="call-outline" label="Call Support" onPress={() => void openSupportLink(`tel:${SUPPORT_CONFIG.phone}`)} />
            <SettingsRow icon="logo-whatsapp" label="WhatsApp Support" onPress={() => void openSupportLink(`https://wa.me/${SUPPORT_CONFIG.whatsapp.replace(/[^\d]/g, '')}`)} />
            <SettingsRow icon="mail-outline" label="Email Support" onPress={() => void openSupportLink(`mailto:${SUPPORT_CONFIG.email}`)} />
          </View>
        </View>

        {isCollector ? (
          <Pressable onPress={() => router.push('/collector-dashboard' as never)} style={styles.collectorCard}>
            <LinearGradient colors={['#993D00', '#E65C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.collectorGradient}>
              <MaterialIcons name="admin-panel-settings" size={28} color="#fff" />
              <View style={styles.collectorCopy}>
                <Text style={styles.collectorTitle}>Collector Portal</Text>
                <Text style={styles.collectorText}>Open verification and collection dashboard.</Text>
              </View>
            </LinearGradient>
          </Pressable>
        ) : null}

        <View style={styles.settingsCard}>
          <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings' as never)} />
          <SettingsRow icon="log-out-outline" label="Logout" onPress={() => void handleLogout()} />
          <SettingsRow icon="trash-outline" label="Delete Account" destructive onPress={() => setShowDeleteConfirm(true)} />
        </View>
      </ScrollView>
      <DeleteAccountModal
        visible={showDeleteConfirm}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onDelete={() => void handleDeleteAccount()}
      />
    </SafeAreaView>
  )
}

function Avatar({ profile }: { profile: ProfileInfo }) {
  if (profile.profileImageUrl) {
    return <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} contentFit="cover" />
  }

  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>{profile.fullName?.charAt(0) || 'D'}</Text>
    </View>
  )
}

function VerificationBadge({ status, onPress }: { status: ProfileInfo['verificationStatus']; onPress: () => void }) {
  const tone = getVerificationTone(status)

  return (
    <Pressable onPress={onPress} style={[styles.verificationBadge, { backgroundColor: tone.background, borderColor: tone.border }]}>
      <MaterialIcons name={tone.icon} size={20} color={tone.color} />
      <View style={styles.verifyCopy}>
        <Text style={[styles.verifyTitle, { color: tone.color }]}>{tone.label}</Text>
        <Text style={styles.verifySubtitle}>{tone.subtitle}</Text>
      </View>
      {status === 'rejected' || status === 'not_submitted' ? <MaterialIcons name="chevron-right" size={22} color="#D7C7B8" /> : null}
    </Pressable>
  )
}

function ProfileInfoRow({ icon, value }: { icon: IonIconName; value: string }) {
  return (
    <View style={styles.profileInfoRow}>
      <Ionicons name={icon} size={18} color="#8B5A00" />
      <Text style={styles.profileMeta}>{value}</Text>
    </View>
  )
}

function getVerificationTone(status: ProfileInfo['verificationStatus']): {
  icon: MaterialIconName
  background: string
  border: string
  color: string
  label: string
  subtitle: string
} {
  if (status === 'verified') {
    return { icon: 'verified', background: '#F1F8E9', border: '#C5E1A5', color: '#2E7D32', label: 'Verified', subtitle: 'Your identity has been verified.' }
  }

  if (status === 'submitted') {
    return { icon: 'schedule', background: '#FFF8ED', border: '#FFE0B3', color: '#B97512', label: 'Under Review', subtitle: 'Your documents are being reviewed.' }
  }

  if (status === 'rejected') {
    return { icon: 'cancel', background: '#FFF1F1', border: '#F3C4C4', color: '#C62828', label: 'Rejected', subtitle: 'Tap to resubmit your verification.' }
  }

  return { icon: 'person-outline', background: '#F4F0EA', border: '#DED6CE', color: '#7E7162', label: 'Not Submitted', subtitle: 'Tap to upload verification documents.' }
}

function StatCard({ icon, label, value }: { icon: MaterialIconName; label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <MaterialIcons name={icon} size={22} color="#993D00" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function SettingsRow({
  icon,
  label,
  destructive = false,
  onPress,
}: {
  icon: IonIconName
  label: string
  destructive?: boolean
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon} size={22} color={destructive ? '#B3261E' : '#7E7162'} />
        <Text style={[styles.settingsRowLabel, destructive && styles.destructiveText]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D7C7B8" />
    </Pressable>
  )
}

function DeleteAccountModal({
  visible,
  isDeleting,
  onCancel,
  onDelete,
}: {
  visible: boolean
  isDeleting: boolean
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Delete Account</Text>
          <Text style={styles.modalText}>This will permanently deactivate your account. You will be logged out and will not be able to access your data.</Text>
          <View style={styles.modalActions}>
            <Pressable disabled={isDeleting} style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable disabled={isDeleting} style={[styles.deleteButton, isDeleting && styles.disabledButton]} onPress={onDelete}>
              {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function formatMonthYear(value: string) {
  if (!value) {
    return 'Unavailable'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF0D9', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF0D9' },
  avatarText: { color: '#993D00', fontSize: 22, fontWeight: '900' },
  headerCopy: { flex: 1 },
  greeting: { color: '#E65C00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  name: { color: '#2B231B', fontSize: 22, fontWeight: '900', marginTop: 2 },
  bellIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stateCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F0E7DD' },
  stateText: { color: '#7E7162', fontSize: 13, fontWeight: '800' },
  errorCard: { backgroundColor: '#FFF7EB', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#FFE0B3', gap: 10 },
  inlineError: { color: '#B3261E', fontSize: 13, fontWeight: '700' },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  retryButtonText: { color: '#8B5A00', fontSize: 12, fontWeight: '900' },
  profileCard: { borderRadius: 28, padding: 18, borderWidth: 1, borderColor: '#F0E7DD', gap: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  profileCopy: { flex: 1, gap: 5 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileMeta: { color: '#7E7162', fontSize: 13, fontWeight: '700' },
  memberSince: { color: '#993D00', fontSize: 12, fontWeight: '900', marginTop: 4 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0D9', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  editButtonText: { color: '#993D00', fontSize: 13, fontWeight: '900' },
  verificationBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 14, borderWidth: 1.5 },
  verifyCopy: { flex: 1, gap: 4 },
  verifyTitle: { fontSize: 15, fontWeight: '900' },
  verifySubtitle: { color: '#7E7162', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#2B231B', fontSize: 20, fontWeight: '900' },
  seeAll: { color: '#E65C00', fontSize: 13, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', minHeight: 128, backgroundColor: '#fff', borderRadius: 22, padding: 14, borderWidth: 1, borderColor: '#F0E7DD', justifyContent: 'space-between' },
  statValue: { color: '#2B231B', fontSize: 28, fontWeight: '900', marginTop: 8 },
  statLabel: { color: '#7E7162', fontSize: 12, fontWeight: '800', lineHeight: 16 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#F0E7DD', gap: 4 },
  emptyTitle: { color: '#2B231B', fontSize: 15, fontWeight: '900' },
  emptyText: { color: '#7E7162', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  bookingsShortcut: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F0E7DD' },
  bookingsShortcutText: { flex: 1, color: '#2B231B', fontSize: 15, fontWeight: '900' },
  collectorCard: { borderRadius: 24, overflow: 'hidden' },
  collectorGradient: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  collectorCopy: { flex: 1 },
  collectorTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  collectorText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 4 },
  settingsCard: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F0E7DD' },
  settingsRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F5EDE4' },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingsRowLabel: { color: '#2B231B', fontSize: 15, fontWeight: '800' },
  destructiveText: { color: '#B3261E' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(43,35,27,0.44)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', borderRadius: 26, backgroundColor: '#fff', padding: 20, gap: 14 },
  modalTitle: { color: '#2B231B', fontSize: 20, fontWeight: '900' },
  modalText: { color: '#7E7162', fontSize: 14, fontWeight: '600', lineHeight: 21 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelButton: { borderRadius: 999, backgroundColor: '#F4F0EA', paddingHorizontal: 16, paddingVertical: 12 },
  cancelButtonText: { color: '#2B231B', fontSize: 13, fontWeight: '900' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: '#B3261E', paddingHorizontal: 16, paddingVertical: 12 },
  deleteButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disabledButton: { opacity: 0.7 },
})
