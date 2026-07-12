import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

// ─── Ashram Contact Info ──────────────────────────────────────────────────────
const ASHRAM_INFO = {
  name: 'Shri Gurudev Ashram',
  address: 'Palaskhed Sapkal, Tehsil Chikhli, District Buldhana, MH — 443001',
  contact: '+91 91587 40007',
  email: 'info@shrigurudevashram.org',
}

// ─── Data Shape ───────────────────────────────────────────────────────────────
export type TravelReceiptData = {
  bookingReference: string
  bookingId: string
  packageTitle: string
  travelStartDate?: string | null
  travelEndDate?: string | null
  travelerCount: number
  totalAmount: number
  status: 'paid' | 'confirmed' | 'payment_pending' | 'cancelled' | 'pending' | 'completed'
  fullName?: string | null
  phoneNumber?: string | null
  createdAt?: string | null
  transportType?: string | null
  roomType?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch { return iso }
}

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

function statusColor(status: TravelReceiptData['status']): string {
  switch (status) {
    case 'paid':
    case 'confirmed':
    case 'completed': return '#2F7132'
    case 'cancelled': return '#C04545'
    default: return '#B97512'
  }
}

function statusLabel(status: TravelReceiptData['status']): string {
  switch (status) {
    case 'paid': return 'PAID'
    case 'confirmed': return 'CONFIRMED'
    case 'completed': return 'COMPLETED'
    case 'cancelled': return 'CANCELLED'
    default: return 'PENDING'
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ReceiptRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  )
}

function ReceiptQRVerification({ reference, bookingId }: { reference: string; bookingId: string }) {
  const codeString = `${reference}|${bookingId}|yatra`
  return (
    <View style={styles.qrSection}>
      <View style={styles.qrBox}>
        {Array.from({ length: 7 }).map((_, row) => (
          <View key={row} style={styles.qrRow}>
            {Array.from({ length: 7 }).map((_, col) => {
              const isFinder =
                (row <= 2 && col <= 2) ||
                (row <= 2 && col >= 4) ||
                (row >= 4 && col <= 2)
              const charCode = codeString.charCodeAt((row * 7 + col) % codeString.length) || 1
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
      <View style={styles.qrTextWrap}>
        <Text style={styles.qrTitle}>Ashram Yatra Verification</Text>
        <Text style={styles.qrSubtitle}>Present at the pilgrimage departure point for check-in.</Text>
        <Text style={styles.qrDataString}>REF: {reference}</Text>
      </View>
    </View>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TravelReceipt({ data }: { data: TravelReceiptData }) {
  const color = statusColor(data.status)

  return (
    <View style={styles.container}>
      {/* ── ASHRAM HEADER ── */}
      <LinearGradient
        colors={['#7B4B00', '#B97512', '#E0A31F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.ashramHeader}
      >
        <View style={styles.logoCircle}>
          <MaterialIcons name="flight" size={26} color="#B97512" />
        </View>
        <View style={styles.ashramText}>
          <Text style={styles.ashramName}>{ASHRAM_INFO.name}</Text>
          <Text style={styles.ashramTagline}>यात्रा · तीर्थ · सेवा</Text>
        </View>
      </LinearGradient>

      {/* ── YATRA STRIP ── */}
      <View style={styles.typeStrip}>
        <View style={styles.typeIconWrap}>
          <MaterialIcons name="directions-bus" size={22} color="#8B5A00" />
        </View>
        <View style={styles.typeStripText}>
          <Text style={styles.typeStripLabel}>OFFICIAL BOOKING RECEIPT</Text>
          <Text style={styles.typeStripTitle} numberOfLines={2}>{data.packageTitle}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${color}18` }]}>
          <Text style={[styles.statusText, { color }]}>{statusLabel(data.status)}</Text>
        </View>
      </View>

      {/* ── DASHED CUT LINE ── */}
      <View style={styles.cutRow}>
        <View style={styles.cutLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.cutRight} />
      </View>

      {/* ── BODY ROWS ── */}
      <View style={styles.body}>
        <ReceiptRow label="Booking Ref." value={data.bookingReference} />
        <ReceiptRow label="Booking Date" value={formatDate(data.createdAt)} />

        {data.travelStartDate ? (
          <ReceiptRow label="Departure" value={formatDate(data.travelStartDate)} highlight />
        ) : null}
        {data.travelEndDate ? (
          <ReceiptRow label="Return" value={formatDate(data.travelEndDate)} highlight />
        ) : null}

        <View style={styles.divider} />

        {data.fullName ? <ReceiptRow label="Lead Traveler" value={data.fullName} /> : null}
        {data.phoneNumber ? <ReceiptRow label="Mobile" value={data.phoneNumber} /> : null}
        <ReceiptRow label="Traveler Count" value={`${data.travelerCount} ${data.travelerCount === 1 ? 'person' : 'persons'}`} />

        <View style={styles.divider} />

        {data.transportType ? (
          <ReceiptRow label="Transport" value={data.transportType} />
        ) : null}
        {data.roomType ? (
          <ReceiptRow label="Accommodation" value={data.roomType} />
        ) : null}

        <ReceiptRow label="Total Amount" value={formatAmount(data.totalAmount)} highlight />
        <ReceiptRow label="Payment Method" value="Razorpay / Online" />

        <View style={styles.divider} />

        {/* ── QR VERIFICATION ── */}
        <ReceiptQRVerification reference={data.bookingReference} bookingId={data.bookingId} />
      </View>

      {/* ── SECOND CUT LINE ── */}
      <View style={styles.cutRow}>
        <View style={styles.cutLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.cutRight} />
      </View>

      {/* ── ASHRAM FOOTER ── */}
      <View style={styles.ashramFooter}>
        <View style={styles.ashramFooterRow}>
          <MaterialIcons name="location-on" size={13} color="#9E9080" />
          <Text style={styles.ashramFooterText}>{ASHRAM_INFO.address}</Text>
        </View>
        <View style={styles.ashramFooterRow}>
          <MaterialIcons name="phone" size={13} color="#9E9080" />
          <Text style={styles.ashramFooterText}>{ASHRAM_INFO.contact}</Text>
          <Text style={styles.ashramFooterSep}>·</Text>
          <MaterialIcons name="email" size={13} color="#9E9080" />
          <Text style={styles.ashramFooterText}>{ASHRAM_INFO.email}</Text>
        </View>
        <View style={styles.thankYouRow}>
          <MaterialIcons name="favorite" size={14} color="#B97512" />
          <Text style={styles.thankYouText}>
            May Guruji's blessings be your guide on every step of this sacred journey. Jai Shri Gurudev!
          </Text>
          <MaterialIcons name="favorite" size={14} color="#B97512" />
        </View>
        <Text style={styles.legalText}>
          This is a computer-generated receipt and is valid without a physical signature.
        </Text>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E7DD',
    shadowColor: '#5B4636',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  // Ashram header
  ashramHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  logoCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.90)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ashramText: { flex: 1 },
  ashramName: { color: '#fff', fontSize: 15, fontWeight: '900', lineHeight: 19 },
  ashramTagline: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Type strip
  typeStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: '#FAF6F0',
  },
  typeIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF0D918',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  typeStripText: { flex: 1 },
  typeStripLabel: { color: '#9E9080', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  typeStripTitle: { color: '#2B231B', fontSize: 13, fontWeight: '800', marginTop: 1 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

  // Cut line
  cutRow: { flexDirection: 'row', alignItems: 'center' },
  cutLeft: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FAF6F0', marginLeft: -8 },
  dashedLine: {
    flex: 1, height: 1, borderWidth: 1, borderColor: '#E8D5BE',
    borderStyle: 'dashed', marginHorizontal: 4,
  },
  cutRight: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FAF6F0', marginRight: -8 },

  // Body
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  rowLabel: { color: '#9E9080', fontSize: 12, fontWeight: '600', flex: 1 },
  rowValue: { color: '#2B231B', fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1 },
  rowValueHighlight: { color: '#8B5A00', fontSize: 15, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#F5EDE4', marginVertical: 2 },

  // QR section
  qrSection: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, backgroundColor: '#FFFDF9', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F0E7DD' },
  qrBox: { padding: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E8D5BE', alignItems: 'center' },
  qrRow: { flexDirection: 'row' },
  qrCell: { width: 6, height: 6, backgroundColor: 'transparent' },
  qrCellFilled: { backgroundColor: '#2B231B' },
  qrTextWrap: { flex: 1, gap: 2 },
  qrTitle: { color: '#8B5A00', fontSize: 13, fontWeight: '800' },
  qrSubtitle: { color: '#7E7162', fontSize: 11, lineHeight: 15 },
  qrDataString: { color: '#B9B1A9', fontSize: 10, fontWeight: '700', marginTop: 2 },

  // Footer
  ashramFooter: {
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#FAF6F0', gap: 6,
  },
  ashramFooterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap',
  },
  ashramFooterText: { color: '#9E9080', fontSize: 11, fontWeight: '600' },
  ashramFooterSep: { color: '#C4BAB0', fontSize: 11 },
  thankYouRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0E7DD',
    marginVertical: 2,
  },
  thankYouText: {
    color: '#7E7162', fontSize: 12, fontWeight: '700',
    fontStyle: 'italic', textAlign: 'center', flex: 1,
  },
  legalText: {
    color: '#C4BAB0', fontSize: 10, textAlign: 'center', fontStyle: 'italic',
  },
})
