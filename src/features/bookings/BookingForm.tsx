import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { KeyboardTypeOptions } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createBooking } from '../../services/bookings'
import { useBookingDraftStore } from '../../store/useBookingDraftStore'
import { BusType, RoomType, TransportType, getYatraPrice } from '../../utils/yatraPricing'

const COLORS = {
  background: '#FAF6F0',
  ivory: '#FCFAF6',
  surface: '#ffffff',
  warmSurface: '#FFF9F0',
  primary: '#E65C00',
  primaryDark: '#993D00',
  primaryLight: '#FF9933',
  text: '#2B231B',
  muted: '#7E7162',
  softText: '#9E9080',
  border: '#F0E7DD',
  line: '#F5EDE4',
  chip: '#FFF0D9',
  success: '#3E8E41',
  shadow: '#5B4636',
}

const STEP_TITLES = [
  { key: 'transport', label: '1', title: 'Route style' },
  { key: 'stay', label: '2', title: 'Comfort tier' },
  { key: 'traveler', label: '3', title: 'Personal info' },
] as const

const TRANSPORT_OPTIONS: Array<{ value: TransportType; title: string; description: string; icon: string }> = [
  { value: 'Flight', title: 'Himalayan Flight Arrival', description: 'Serene flights with guided transfer support.', icon: 'flight' },
  { value: 'Train', title: 'Sacred Rail Journey', description: 'Overland railway travel with scenic pacing.', icon: 'train' },
]

const TRAIN_OPTIONS: Array<{ value: BusType; title: string; description: string }> = [
  { value: 'AC Train', title: 'Premium AC Coach', description: 'Air-cooled travel with elevated comfort.' },
  { value: 'Non-AC Train', title: 'Standard Sacred Coach', description: 'Classic natural-air travel with fellow pilgrims.' },
]

const ROOM_OPTIONS: Array<{ value: RoomType; title: string; description: string }> = [
  { value: 'AC Room', title: 'Sacred AC Suite', description: 'Cooled private rest space for peaceful meditation.' },
  { value: 'Non-AC Room', title: 'Traditional Cottage', description: 'Spiritual simplicity with comfortable natural ventilation.' },
]

function parseTravelerCount(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

function parsePriceAmount(price: string | undefined) {
  if (!price) return 0
  const parsed = Number(price.replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatAmount(amount: number) {
  return `INR ${amount.toLocaleString('en-IN')}`
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function calculateAge(dateString: string) {
  if (!dateString) return ''
  const birthDate = new Date(dateString)
  if (Number.isNaN(birthDate.getTime())) return ''

  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDelta = now.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return String(Math.max(age, 0))
}

function ChoiceCard({
  title,
  description,
  icon,
  selected,
  onPress,
}: {
  title: string
  description: string
  icon?: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        selected && styles.choiceCardSelected,
        pressed && styles.choiceCardPressed,
      ]}
    >
      <View style={styles.choiceRow}>
        <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
          {icon ? (
            <MaterialIcons name={icon as any} size={20} color={selected ? '#ffffff' : COLORS.primary} />
          ) : (
            <Ionicons name="sparkles" size={18} color={selected ? '#ffffff' : COLORS.primary} />
          )}
        </View>
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>{title}</Text>
          <Text style={styles.choiceDescription}>{description}</Text>
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioInner} /> : null}</View>
      </View>
    </Pressable>
  )
}

export default function BookingForm() {
  const router = useRouter()
  const draft = useBookingDraftStore((state) => state)
  const updateField = useBookingDraftStore((state) => state.updateField)
  const selectedPackage = useBookingDraftStore((state) => state.selectedPackage)
  const [stepIndex, setStepIndex] = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const transportType = draft.transportType || 'Flight'
  const busType = draft.busType || 'AC Train'
  const roomType = draft.roomType || 'AC Room'
  const travelerCount = useMemo(() => parseTravelerCount(draft.numberOfTravelers), [draft.numberOfTravelers])
  const packageUnitAmount = selectedPackage?.priceAmount || parsePriceAmount(selectedPackage?.price)
  const totalAmount = useMemo(() => packageUnitAmount * travelerCount, [packageUnitAmount, travelerCount])
  const preferencePricing = useMemo(
    () => getYatraPrice(transportType as TransportType, roomType as RoomType, busType as BusType),
    [transportType, roomType, busType],
  )
  const step = STEP_TITLES[stepIndex]

  useEffect(() => {
    if (!draft.transportType) updateField('transportType', 'Flight')
    if (!draft.roomType) updateField('roomType', 'AC Room')
    if (!draft.busType) updateField('busType', 'AC Train')
  }, [draft.busType, draft.roomType, draft.transportType, updateField])

  useEffect(() => {
    if (draft.dob) {
      updateField('age', calculateAge(draft.dob))
    }
  }, [draft.dob, updateField])

  const submitBooking = async () => {
    if (!selectedPackage) {
      setErrorMessage('Please select a travel package before booking.')
      return
    }

    if (travelerCount < 1) {
      setErrorMessage('Enter at least one traveler.')
      return
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setErrorMessage('This package does not have a valid price yet. Please try another package.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const booking = await createBooking({
        packageId: selectedPackage.id,
        travelerCount,
        specialNotes: draft.specialNotes,
        totalAmount,
      })

      updateField('bookingReference', booking.bookingReference)
      router.replace({
        pathname: '/(tabs)/travel/upload-documents/[bookingId]',
        params: {
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
        },
      } as never)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!selectedPackage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <MaterialIcons name="travel-explore" size={42} color={COLORS.primaryDark} />
          <Text style={styles.emptyTitle}>Select a yatra first</Text>
          <Text style={styles.emptyText}>Choose a travel package before starting the booking form.</Text>
          <TouchableOpacity style={styles.secondaryButtonFull} onPress={() => router.replace('/(tabs)/travel' as never)}>
            <Text style={styles.secondaryButtonText}>Back to Travel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const today = new Date()
  const minimumDate = new Date(today.getFullYear() - 110, today.getMonth(), today.getDate())

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={COLORS.primaryDark} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Sadhak Registration</Text>
            <Text style={styles.headerTitle}>{selectedPackage.title}</Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialIcons name="spa" size={14} color={COLORS.primaryDark} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>LIVE PACKAGE TOTAL</Text>
              <Text style={styles.heroAmount}>{formatAmount(totalAmount)}</Text>
            </View>
            <View style={styles.heroPill}>
              <MaterialIcons name="schedule" size={14} color={COLORS.primaryDark} />
              <Text style={styles.heroPillText}>{selectedPackage.duration}</Text>
            </View>
          </View>
          <View style={styles.heroConfigSummary}>
            <Text style={styles.heroConfigText}>
              Preferences: <Text style={styles.boldText}>{transportType}</Text>
              {transportType === 'Train' ? ` (${busType})` : ''} / <Text style={styles.boldText}>{roomType}</Text>
            </Text>
          </View>
          <View style={styles.inclusionsRow}>
            {preferencePricing.inclusions.map((inclusion) => (
              <View key={inclusion} style={styles.inclusionBadge}>
                <Ionicons name="checkmark-circle-outline" size={12} color={COLORS.primary} />
                <Text style={styles.inclusionText}>{inclusion}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.stepperContainer}>
          <View style={styles.stepperProgressLine}>
            <View style={[styles.stepperProgressFill, { width: `${(stepIndex / (STEP_TITLES.length - 1)) * 100}%` }]} />
          </View>
          <View style={styles.stepperNodesRow}>
            {STEP_TITLES.map((item, index) => {
              const active = index === stepIndex
              const completed = index < stepIndex
              return (
                <View key={item.key} style={styles.stepperNodeWrap}>
                  <View style={[styles.stepperNode, active && styles.stepperNodeActive, completed && styles.stepperNodeCompleted]}>
                    {completed ? (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    ) : (
                      <Text style={[styles.stepperNodeText, active && styles.stepperNodeTextActive]}>{item.label}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepperNodeLabel, active && styles.stepperNodeLabelActive]}>{item.title}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <Animated.View key={step.key} entering={FadeInDown.duration(350)} exiting={FadeOut.duration(200)} style={styles.card}>
          {step.key === 'transport' ? (
            <View style={styles.sectionGap}>
              <View>
                <Text style={styles.sectionTitle}>Choose transport that suits you well</Text>
                <Text style={styles.sectionSubtitle}>Select the sacred route arrival option for this yatra.</Text>
              </View>
              <View style={styles.choiceList}>
                {TRANSPORT_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    description={option.description}
                    icon={option.icon}
                    selected={transportType === option.value}
                    onPress={() => {
                      updateField('transportType', option.value)
                      if (option.value === 'Flight') {
                        updateField('busType', 'AC Train')
                      }
                    }}
                  />
                ))}
              </View>
              <PrimaryButton title="Continue" onPress={() => setStepIndex(1)} />
            </View>
          ) : null}

          {step.key === 'stay' ? (
            <View style={styles.sectionGap}>
              <View>
                <Text style={styles.sectionTitle}>Select journey comfort</Text>
                <Text style={styles.sectionSubtitle}>Choose the level of comfort that matches the traveler's rest requirements.</Text>
              </View>

              {transportType === 'Train' ? (
                <>
                  <Text style={styles.groupLabel}>Sadhak coach options</Text>
                  <View style={styles.choiceList}>
                    {TRAIN_OPTIONS.map((option) => (
                      <ChoiceCard
                        key={option.value}
                        title={option.title}
                        description={option.description}
                        selected={busType === option.value}
                        onPress={() => updateField('busType', option.value)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.groupLabel}>Ashram stay options</Text>
              <View style={styles.choiceList}>
                {ROOM_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    description={option.description}
                    selected={roomType === option.value}
                    onPress={() => updateField('roomType', option.value)}
                  />
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStepIndex(0)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <PrimaryButton title="Continue" onPress={() => setStepIndex(2)} style={styles.actionPrimary} />
              </View>
            </View>
          ) : null}

          {step.key === 'traveler' ? (
            <View style={styles.sectionGap}>
              <View>
                <Text style={styles.sectionTitle}>Traveler information</Text>
                <Text style={styles.sectionSubtitle}>These details remain in the draft while the booking request is submitted.</Text>
              </View>

              <InputField label="Full Name" value={draft.fullName} onChangeText={(value) => updateField('fullName', value)} placeholder="Enter complete legal name" />
              <View style={styles.row}>
                <View style={styles.flexItem}>
                  <InputField
                    label="Phone Number"
                    value={draft.phoneNumber}
                    onChangeText={(value) => updateField('phoneNumber', value.replace(/[^\d]/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.flexItem}>
                  <InputField
                    label="WhatsApp Number"
                    value={draft.whatsappNumber}
                    onChangeText={(value) => updateField('whatsappNumber', value.replace(/[^\d]/g, '').slice(0, 10))}
                    placeholder="10-digit WhatsApp"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldLabel}>Date of Birth</Text>
                  <Pressable style={styles.pickerField} onPress={() => setShowDatePicker(true)}>
                    <Text style={[styles.pickerValue, !draft.dob && styles.pickerPlaceholder]}>
                      {draft.dob ? formatDate(new Date(draft.dob)) : 'Select DOB'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.agePill}>
                  <Text style={styles.ageLabel}>Age</Text>
                  <Text style={styles.ageValue}>{draft.age || '--'}</Text>
                </View>
              </View>

              <InputField
                label="Address"
                value={draft.address}
                onChangeText={(value) => updateField('address', value)}
                placeholder="Complete address"
                multiline
              />
              <InputField
                label="Traveler Count"
                value={draft.numberOfTravelers}
                onChangeText={(value) => updateField('numberOfTravelers', value.replace(/[^\d]/g, ''))}
                placeholder="1"
                keyboardType="number-pad"
              />
              <InputField
                label="Special Notes"
                value={draft.specialNotes}
                onChangeText={(value) => updateField('specialNotes', value)}
                placeholder="Dietary needs, accessibility requests, or other notes"
                multiline
              />

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <View style={styles.priceCard}>
                <Text style={styles.priceCardLabel}>Supabase booking total</Text>
                <Text style={styles.priceValue}>{formatAmount(totalAmount)}</Text>
                <Text style={styles.installmentNote}>
                  This total uses the live package price and traveler count. Transport and room choices are preserved as draft preferences.
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryButton} disabled={isSubmitting} onPress={() => setStepIndex(1)}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <PrimaryButton
                  title={isSubmitting ? 'Submitting' : 'Submit Booking'}
                  onPress={submitBooking}
                  disabled={isSubmitting}
                  style={styles.actionPrimary}
                />
              </View>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      {showDatePicker ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowDatePicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <DateTimePicker
                value={draft.dob ? new Date(draft.dob) : new Date(1995, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                maximumDate={new Date()}
                minimumDate={minimumDate}
                onChange={(_, selectedDate) => {
                  if (!selectedDate) return
                  const isoDate = selectedDate.toISOString().split('T')[0]
                  updateField('dob', isoDate)
                  updateField('age', calculateAge(isoDate))
                  if (Platform.OS !== 'ios') {
                    setShowDatePicker(false)
                  }
                }}
              />
              {Platform.OS === 'ios' ? (
                <TouchableOpacity style={styles.modalButton} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaView>
  )
}

function PrimaryButton({
  title,
  onPress,
  disabled,
  style,
}: {
  title: string
  onPress: () => void
  disabled?: boolean
  style?: object
}) {
  return (
    <TouchableOpacity style={[styles.primaryButton, disabled && styles.primaryButtonDisabled, style]} disabled={disabled} onPress={onPress}>
      <LinearGradient colors={['#E65C00', '#FF9933']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonGradient}>
        <Text style={styles.primaryButtonText}>{title}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  )
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  keyboardType?: KeyboardTypeOptions
  multiline?: boolean
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.softText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroLabel: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heroAmount: {
    color: COLORS.primaryDark,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.chip,
    flexShrink: 1,
  },
  heroPillText: {
    color: COLORS.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },
  heroConfigSummary: {
    marginTop: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    gap: 4,
  },
  heroConfigText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  inclusionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  inclusionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inclusionText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  stepperContainer: {
    marginVertical: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  stepperProgressLine: {
    height: 4,
    backgroundColor: COLORS.line,
    borderRadius: 2,
    position: 'absolute',
    top: 34,
    left: 44,
    right: 44,
  },
  stepperProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepperNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperNodeWrap: {
    alignItems: 'center',
    width: 70,
  },
  stepperNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stepperNodeActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    transform: [{ scale: 1.1 }],
  },
  stepperNodeCompleted: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  stepperNodeText: {
    color: COLORS.softText,
    fontSize: 12,
    fontWeight: '800',
  },
  stepperNodeTextActive: {
    color: COLORS.primary,
  },
  stepperNodeLabel: {
    marginTop: 8,
    color: COLORS.softText,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  stepperNodeLabelActive: {
    color: COLORS.primaryDark,
    fontWeight: '900',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  sectionGap: {
    gap: 18,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  choiceList: {
    gap: 12,
  },
  choiceCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.ivory,
    padding: 16,
  },
  choiceCardSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.warmSurface,
  },
  choiceCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  choiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconSelected: {
    backgroundColor: COLORS.primary,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  choiceTitleSelected: {
    color: COLORS.primaryDark,
  },
  choiceDescription: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 2,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  actionPrimary: {
    flex: 2,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: COLORS.ivory,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  secondaryButtonFull: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: COLORS.ivory,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  groupLabel: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexItem: {
    flex: 1,
  },
  inputBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.ivory,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  textArea: {
    minHeight: 96,
  },
  pickerField: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.ivory,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
    justifyContent: 'center',
  },
  pickerValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pickerPlaceholder: {
    color: COLORS.softText,
    fontWeight: '600',
  },
  agePill: {
    width: 90,
    borderRadius: 18,
    backgroundColor: COLORS.warmSurface,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  ageLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  ageValue: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  priceCard: {
    borderRadius: 24,
    backgroundColor: COLORS.warmSurface,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    gap: 8,
  },
  priceCardLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priceValue: {
    color: COLORS.primaryDark,
    fontSize: 30,
    fontWeight: '900',
  },
  installmentNote: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,35,27,0.48)',
    padding: 20,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    padding: 22,
    gap: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
})
