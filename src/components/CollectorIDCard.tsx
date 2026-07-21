import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { AuthUser } from '../services/auth'

// ─── Props ────────────────────────────────────────────────────────────────────
type CollectorIDCardProps = {
  user: AuthUser
  collectorId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatCollectorId(userId: string): string {
  // Last 8 chars of UUID, uppercased
  return `SGA-${userId.slice(-8).toUpperCase()}`
}

// ─── QR Placeholder (Encodes ID deterministically) ────────────────────────────
function QRPlaceholder({ id }: { id: string }) {
  // Use char codes of ID to deterministically generate QR dot grid
  return (
    <View style={styles.qrWrap}>
      <View style={{ padding: 8, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E8D5BE', alignItems: 'center' }}>
        {Array.from({ length: 7 }).map((_, row) => (
          <View key={row} style={styles.qrRow}>
            {Array.from({ length: 7 }).map((_, col) => {
              const isFinder =
                (row <= 2 && col <= 2) ||
                (row <= 2 && col >= 4) ||
                (row >= 4 && col <= 2)
              const charCode = id.charCodeAt((row * 7 + col) % id.length) || 1
              const filled = isFinder || (charCode % 2 === 0)

              return (
                <View
                  key={col}
                  style={[styles.qrCell, filled && styles.qrCellFilled]}
                />
              )
            })}
          </View>
        ))}
      </View>
      <Text style={styles.qrLabel}>Scan to Verify ID: {id}</Text>
    </View>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CollectorIDCard({ user, collectorId: registeredCollectorId }: CollectorIDCardProps) {
  const initials = getInitials(user.fullName)
  const collectorId = registeredCollectorId ? `SGA-${registeredCollectorId.slice(-8).toUpperCase()}` : formatCollectorId(user.id)
  const isVerified = user.verificationStatus === 'verified'
  const issueDateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <View style={styles.card}>
      {/* Top gradient header */}
      <LinearGradient
        colors={['#4A2E00', '#7B4B00', '#B97512']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Ashram watermark circle */}
        <View style={styles.watermark} pointerEvents="none">
          <MaterialIcons name="brightness-5" size={120} color="rgba(255,255,255,0.06)" />
        </View>

        {/* Ashram name */}
        <View style={styles.ashramRow}>
          <MaterialIcons name="brightness-5" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.ashramName}>SHRI GURUDEV ASHRAM</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Name */}
        <Text style={styles.collectorName}>{user.fullName}</Text>

        {/* Status badge */}
        <View style={[styles.statusBadge, isVerified ? styles.statusVerified : styles.statusPending]}>
          <MaterialIcons
            name={isVerified ? 'verified' : 'hourglass-empty'}
            size={13}
            color={isVerified ? '#2F7132' : '#B97512'}
          />
          <Text style={[styles.statusText, { color: isVerified ? '#2F7132' : '#B97512' }]}>
            {isVerified ? 'Verified Collector' : 'Pending Verification'}
          </Text>
        </View>
      </LinearGradient>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.infoGrid}>
          <IDField label="Collector ID" value={collectorId} icon="badge" />
          <IDField label="Mobile" value={user.phone || '—'} icon="phone" />
          <IDField label="Role" value="Collector" icon="groups" />
          <IDField label="Status" value={user.verificationStatus.replace('_', ' ')} icon="shield" />
          <IDField label="Issue Date" value={issueDateStr} icon="event" />
          <IDField label="Issued By" value="Shri Gurudev Ashram" icon="account-balance" />
          <IDField label="Valid Till" value="Permanent" icon="verified" />
        </View>

        <View style={styles.divider} />

        {/* QR Code placeholder */}
        <QRPlaceholder id={collectorId} />

        {/* Footer */}
        <Text style={styles.footer}>
          This card is issued by Shri Gurudev Ashram. For verification, scan the QR code or contact the Ashram directly.
        </Text>
      </View>
    </View>
  )
}

function IDField({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.idField}>
      <View style={styles.idFieldIcon}>
        <MaterialIcons name={icon as any} size={14} color="#9E9080" />
      </View>
      <View>
        <Text style={styles.idFieldLabel}>{label}</Text>
        <Text style={styles.idFieldValue}>{value}</Text>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8D5BE',
    shadowColor: '#5B4636',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    gap: 8,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: -20,
    right: -20,
  },
  ashramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ashramName: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.40)',
    marginTop: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  collectorName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 2,
  },
  statusVerified: { backgroundColor: 'rgba(255,255,255,0.95)' },
  statusPending: { backgroundColor: 'rgba(255,255,255,0.88)' },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  // Body
  body: {
    backgroundColor: '#fff',
    padding: 20,
    gap: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  idField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '45%',
  },
  idFieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  idFieldLabel: {
    color: '#9E9080',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  idFieldValue: {
    color: '#2B231B',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },

  divider: { height: 1, backgroundColor: '#F5EDE4' },

  // QR
  qrWrap: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  qrRow: {
    flexDirection: 'row',
    gap: 4,
  },
  qrCell: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: 'rgba(139,90,0,0.08)',
  },
  qrCellFilled: {
    backgroundColor: '#8B5A00',
  },
  qrLabel: {
    color: '#9E9080',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
  },

  // Footer
  footer: {
    color: '#B9B1A9',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
