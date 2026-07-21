import React, { useCallback, useRef, useState, useMemo } from 'react'
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import RazorpayCheckout from 'react-native-razorpay'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'

import { createDonation, createDonationOrder, getDonationHeads, getRecentDonations, getTopDonors } from '../../services/donation'
import { useAuthStore } from '../../store/useAuthStore'

/* ─── Design tokens ─── */
const C = {
  bg: '#FAF6F0',
  card: '#FFFFFF',
  cardBorder: '#F0E7DD',
  saffron: '#B8860B',
  saffronDark: '#8B6914',
  saffronLight: '#FFF5E1',
  saffronGlow: '#D4A017',
  orange: '#E65C00',
  text: '#2B231B',
  textSoft: '#7E7162',
  textMuted: '#9E9080',
  accent: '#993D00',
  ivory: '#FFF9F0',
  trustGreen: '#3D7A4A',
  shadow: '#5b4636',
  error: '#D32F2F',
}

const { width: SCREEN_W } = Dimensions.get('window')
const DEFAULT_PRESET_AMOUNTS = [500, 1100, 2100, 5100, 11000, 51000]

export type DonationState = {
  categoryId: string | null
  amount: number | null
  customAmount: string
  fullName: string
  country: string
  mobile: string
  addressLine: string
  city: string
  state: string
  pincode: string
  pan: string
  dob: Date | null
  anonymousDisplay: boolean
  referralCode: string
}

const initialDonationState: DonationState = {
  categoryId: null,
  amount: null,
  customAmount: '',
  fullName: '',
  country: 'India (+91)',
  mobile: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  pan: '',
  dob: null,
  anonymousDisplay: false,
  referralCode: '',
}

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(20)

  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }))
    translateY.value = withDelay(delay, withSpring(0, { damping: 15 }))
  }, [delay])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }))

  return (
    <Reanimated.View style={style}>
      {children}
    </Reanimated.View>
  )
}

function AmountChip({ value, selected, onPress }: { value: number; selected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.92, { damping: 15 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
    >
      <Reanimated.View style={[styles.amountChip, selected && styles.amountChipSelected, animStyle]}>
        <Text style={[styles.amountChipText, selected && styles.amountChipTextSelected]}>
          ₹{value.toLocaleString('en-IN')}
        </Text>
      </Reanimated.View>
    </Pressable>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = ['Amount', 'Donor Details', 'Review', 'Payment']
  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => {
        const stepNum = index + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep
        return (
          <View key={step} style={styles.stepWrapper}>
            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, isActive && styles.stepCircleActive, isCompleted && styles.stepCircleCompleted]}>
                {isCompleted ? (
                  <MaterialIcons name="check" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{stepNum}</Text>
                )}
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
              )}
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step}</Text>
          </View>
        )
      })}
    </View>
  )
}

export default function DonationScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const scrollRef = useRef<ScrollView>(null)

  const [step, setStep] = useState(1)
  const [state, setState] = useState<DonationState>({
    ...initialDonationState,
    fullName: user?.fullName || '',
    mobile: user?.phone || '',
  })

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const { data: headsData, isLoading: loadingHeads } = useQuery({
    queryKey: ['donation-heads'],
    queryFn: getDonationHeads
  })
  const { data: recentData } = useQuery({
    queryKey: ['recent-donations'],
    queryFn: getRecentDonations
  })
  const { data: topData } = useQuery({
    queryKey: ['top-donors'],
    queryFn: getTopDonors
  })

  const donationHeads = headsData?.data || []
  const recentDonations = recentData || []
  const topDonors = topData || []

  const selectedCategoryObj = donationHeads.find((c: any) => c.id === state.categoryId)
  
  const currentPresetAmounts = selectedCategoryObj?.presetAmounts?.length > 0 
    ? selectedCategoryObj.presetAmounts 
    : DEFAULT_PRESET_AMOUNTS

  const effectiveAmount = state.amount ?? (state.customAmount ? parseInt(state.customAmount, 10) : 0)

  const updateField = useCallback((field: keyof DonationState, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleNext = () => {
    if (step === 1) {
      if (!state.categoryId) {
        Alert.alert('Validation Error', 'Please select a donation cause.')
        return
      }
      if (effectiveAmount < 10) {
        Alert.alert('Validation Error', 'Donation amount must be at least ₹10.')
        return
      }
      setStep(2)
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    } else if (step === 2) {
      if (!state.fullName.trim() || !state.mobile.trim() || !state.addressLine.trim() || !state.city.trim() || !state.state.trim() || !state.pincode.trim() || !state.pan.trim() || !state.dob) {
        Alert.alert('Validation Error', 'Please fill in all required donor details (Name, Mobile, Address, PAN, DOB).')
        return
      }
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/i
      if (!panRegex.test(state.pan.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid 10-character PAN number.')
        return
      }
      setStep(3)
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    } else {
      router.back()
    }
  }

  const handleDonate = useCallback(async () => {
    setIsPaying(true)
    try {
      const donationRes = await createDonation({
        amount: effectiveAmount,
        donationHead: { id: state.categoryId },
        referralCode: state.referralCode,
        donor: {
          name: state.fullName,
          mobile: state.mobile,
          email: '', // unused in new form
          idNumber: state.pan.toUpperCase(),
          dob: state.dob?.toISOString(),
          anonymousDisplay: state.anonymousDisplay,
          addressObj: {
            line: state.addressLine,
            city: state.city,
            state: state.state,
            pincode: state.pincode,
            country: state.country
          }
        }
      })

      const orderRes = await createDonationOrder(donationRes.donationId)

      const checkoutResult = await RazorpayCheckout.open({
        key: orderRes.key,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'Shri Gurudev Ashram',
        description: 'Donation',
        order_id: orderRes.razorpayOrderId,
        prefill: {
          name: state.fullName,
          contact: state.mobile,
        },
        theme: { color: '#E65C00' },
      })

      await new Promise((resolve) => setTimeout(resolve, 2000))

      router.replace({
        pathname: '/donation-success',
        params: { 
          donationId: donationRes.donationId,
          amount: effectiveAmount.toString(),
          cause: selectedCategoryName
        }
      } as never)

    } catch (error: any) {
      Alert.alert('Payment Error', error?.message || 'Failed to complete donation. Please try again.')
    } finally {
      setIsPaying(false)
    }
  }, [state, effectiveAmount, router])

  const selectedCategoryName = useMemo(() => {
    const head = donationHeads.find((h: any) => h._id === state.categoryId || h.key === state.categoryId || h.id === state.categoryId)
    return head ? (head.name?.en || head.name?.hi || head.name) : 'General Seva'
  }, [state.categoryId, donationHeads])

  const renderStep1 = () => {
    return (
      <AnimatedSection>
        <Text style={styles.sectionTitle}>What would you like to support?</Text>
        
        {loadingHeads ? (
          <ActivityIndicator color={C.orange} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.categoryGrid}>
            {donationHeads.map((cat: any) => {
              const catId = cat._id || cat.id
              const isSelected = state.categoryId === catId
              return (
                <Pressable
                  key={catId}
                  style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                  onPress={() => updateField('categoryId', catId)}
                >
                  {cat.imageUrl && (
                    <View style={styles.categoryImageWrap}>
                      <Image source={{ uri: cat.imageUrl }} style={styles.categoryImage} contentFit="cover" />
                    </View>
                  )}
                  <View style={styles.categoryContent}>
                    <Text style={[styles.categoryTitle, isSelected && styles.categoryTitleSelected]} numberOfLines={1}>
                      {cat.name?.en || cat.name?.hi || cat.name}
                    </Text>
                    <Text style={styles.categoryDesc} numberOfLines={2}>{cat.description}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.categoryCheck}>
                      <MaterialIcons name="check-circle" size={20} color={C.orange} />
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        )}

        {state.categoryId && (
          <AnimatedSection delay={100}>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Select Donation Amount</Text>
            <View style={styles.amountRow}>
              {currentPresetAmounts.map((amt: number) => (
                <AmountChip
                  key={amt}
                  value={amt}
                  selected={state.amount === amt}
                  onPress={() => {
                    updateField('amount', state.amount === amt ? null : amt)
                    updateField('customAmount', '')
                  }}
                />
              ))}
            </View>

            <View style={styles.customAmountWrap}>
              <View style={styles.customInputRow}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.customInput}
                  value={state.customAmount}
                  onChangeText={(v) => {
                    updateField('customAmount', v.replace(/[^0-9]/g, ''))
                    updateField('amount', null)
                  }}
                  placeholder="Other Amount"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  maxLength={8}
                />
              </View>
            </View>
          </AnimatedSection>
        )}

        {/* Referral Code */}
        <View style={[styles.formField, { marginTop: 24 }]}>
          <Text style={styles.fieldLabel}>Have a referral code? <Text style={styles.optionalBadge}>(Optional)</Text></Text>
          <TextInput
            style={styles.fieldInput}
            value={state.referralCode}
            onChangeText={(v) => updateField('referralCode', v.toUpperCase())}
            placeholder="ENTER REFERRAL CODE"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
          />
          <Text style={styles.hintText}>If a volunteer referred you, please enter their code here.</Text>
        </View>

        <View style={styles.socialProofRow}>
          <View style={styles.socialProofCol}>
            <Text style={styles.socialProofTitle}><MaterialIcons name="favorite" size={14} color="#4CAF50" /> Recent Donations</Text>
            {recentDonations.slice(0, 5).map((d: any) => (
              <View key={d.id} style={styles.proofItem}>
                <Text style={styles.proofName} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.proofAmount}>₹{d.amount}</Text>
              </View>
            ))}
          </View>
          <View style={styles.socialProofCol}>
            <Text style={styles.socialProofTitle}><MaterialIcons name="emoji-events" size={14} color={C.saffron} /> Top Donors</Text>
            {topDonors.map((d: any) => (
              <View key={d.id} style={styles.proofItem}>
                <Text style={styles.proofName} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.proofAmount}>₹{d.totalAmount}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </AnimatedSection>
    )
  }

  const renderStep2 = () => (
    <AnimatedSection delay={0}>
      <Text style={styles.sectionTitleCenter}>Donor Details</Text>

      <View style={styles.formCard}>
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.fieldInput}
            value={state.fullName}
            onChangeText={(v) => updateField('fullName', v)}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Country</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: '#f5f5f5', color: '#888' }]}
            value={state.country}
            editable={false}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Mobile Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.fieldInput}
            value={state.mobile}
            onChangeText={(v) => updateField('mobile', v)}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 12, marginBottom: 8, fontSize: 15 }]}>Address Details</Text>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Address Line <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.fieldInput}
            value={state.addressLine}
            onChangeText={(v) => updateField('addressLine', v)}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>City <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.fieldInput} value={state.city} onChangeText={(v) => updateField('city', v)} />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>State <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.fieldInput} value={state.state} onChangeText={(v) => updateField('state', v)} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Pincode <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.fieldInput} value={state.pincode} onChangeText={(v) => updateField('pincode', v)} keyboardType="number-pad" maxLength={6} />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.formField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Country</Text>
            <TextInput style={[styles.fieldInput, { backgroundColor: '#f5f5f5', color: '#888' }]} value="India" editable={false} />
          </View>
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>PAN Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.fieldInput}
            value={state.pan}
            onChangeText={(v) => updateField('pan', v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
          />
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>PAN is mandatory for statutory donation records as per Income Tax regulations. Your information is kept confidential.</Text>
          </View>
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Date of Birth <Text style={styles.required}>*</Text></Text>
          <Pressable style={styles.fieldInput} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: state.dob ? C.text : C.textMuted }}>
              {state.dob ? state.dob.toLocaleDateString('en-IN') : 'DD / MM / YYYY'}
            </Text>
            <MaterialIcons name="calendar-today" size={18} color={C.textMuted} style={{ position: 'absolute', right: 12, top: 12 }} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={state.dob || new Date(2000, 0, 1)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios')
                if (date) updateField('dob', date)
              }}
            />
          )}
        </View>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => updateField('anonymousDisplay', !state.anonymousDisplay)}
        >
          <MaterialIcons name={state.anonymousDisplay ? 'check-box' : 'check-box-outline-blank'} size={24} color={state.anonymousDisplay ? C.orange : C.textMuted} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.checkboxLabel}>Display my name as Anonymous publicly</Text>
            <Text style={styles.checkboxSub}>This only affects public donation lists. All details are still collected internally.</Text>
          </View>
        </Pressable>
      </View>
    </AnimatedSection>
  )

  const renderStep3 = () => (
    <AnimatedSection delay={0}>
      <Text style={styles.sectionTitleCenter}>Review Donation Details</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryHeader}>Donation Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cause:</Text>
          <Text style={styles.summaryValue}>{selectedCategoryName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount:</Text>
          <Text style={styles.summaryValueHighlight}>₹{effectiveAmount.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryHeader}>Donor Information</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Full Name:</Text>
          <Text style={styles.summaryValue}>{state.fullName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mobile Number:</Text>
          <Text style={styles.summaryValue}>{state.mobile}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Address:</Text>
          <Text style={styles.summaryValue} numberOfLines={2}>
            {state.addressLine}, {state.city}, {state.state}, {state.pincode}, India
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>PAN Number:</Text>
          <Text style={styles.summaryValue}>{state.pan}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date of Birth:</Text>
          <Text style={styles.summaryValue}>{state.dob ? state.dob.toLocaleDateString('en-IN') : ''}</Text>
        </View>
      </View>

      <View style={styles.totalBanner}>
        <Text style={styles.totalBannerLabel}>Total Donation Amount:</Text>
        <Text style={styles.totalBannerAmount}>₹{effectiveAmount.toLocaleString('en-IN')}</Text>
      </View>
    </AnimatedSection>
  )

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={C.orange} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Make a Donation</Text>
        </View>
        <View style={styles.emptyWrap} />
      </View>

      <Stepper currentStep={step} />

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Sticky Footer Actions ─── */}
      <Reanimated.View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {step > 1 && (
          <Pressable style={styles.outlineBtn} onPress={handleBack}>
            <Text style={styles.outlineBtnText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.primaryBtn, step > 1 && { flex: 1.5 }]}
          onPress={step === 3 ? handleDonate : handleNext}
          disabled={isPaying}
        >
          {isPaying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {step === 3 ? 'Proceed to Payment' : 'Continue'}
            </Text>
          )}
        </Pressable>
      </Reanimated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cardBorder },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.saffronDark },
  emptyWrap: { width: 40 },

  stepperContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  stepWrapper: { alignItems: 'center', flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  stepCircleActive: { backgroundColor: C.orange },
  stepCircleCompleted: { backgroundColor: C.orange },
  stepNumber: { color: '#757575', fontSize: 12, fontWeight: 'bold' },
  stepNumberActive: { color: '#fff' },
  stepLine: { height: 2, backgroundColor: '#E0E0E0', flex: 1, position: 'absolute', right: '-50%', width: '100%', zIndex: 1 },
  stepLineCompleted: { backgroundColor: C.orange },
  stepLabel: { fontSize: 10, color: '#757575', marginTop: 4, fontWeight: '600' },
  stepLabelActive: { color: C.text },

  scrollContent: { paddingHorizontal: 18, paddingTop: 16, gap: 16 },
  sectionLabel: { fontSize: 18, fontWeight: '800', color: C.saffronDark, marginBottom: 8 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: C.saffronDark, marginBottom: 16 },
  sectionTitleCenter: { fontSize: 22, fontWeight: '900', color: C.saffronDark, textAlign: 'center', marginVertical: 12 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: (SCREEN_W - 36 - 12) / 2, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' },
  categoryCardSelected: { borderColor: C.orange, borderWidth: 2 },
  categoryImage: { width: '100%', height: 100, backgroundColor: '#f0f0f0' },
  categoryImageWrap: { width: '100%', height: 100, backgroundColor: '#f0f0f0', overflow: 'hidden' },
  categoryIconWrap: { width: '100%', height: 100, backgroundColor: C.saffronLight, alignItems: 'center', justifyContent: 'center' },
  categoryContent: { padding: 12 },
  categoryTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 4 },
  categoryTitleSelected: { color: C.orange },
  categoryDesc: { fontSize: 11, color: C.textMuted, lineHeight: 16 },
  categoryCheck: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 12 },

  amountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  amountChipSelected: { backgroundColor: C.orange, borderColor: C.orange },
  amountChipText: { fontSize: 15, fontWeight: '800', color: C.text },
  amountChipTextSelected: { color: '#fff' },

  customAmountWrap: { marginTop: 12 },
  customInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: C.cardBorder, height: 48 },
  rupeeSymbol: { fontSize: 16, fontWeight: '700', color: C.text, marginRight: 8 },
  customInput: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },

  impactBanner: { backgroundColor: C.orange, borderRadius: 12, padding: 16, marginTop: 16 },
  impactBannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  impactStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  impactStatItem: { alignItems: 'center' },
  impactStatNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  impactStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4, textTransform: 'uppercase' },

  formCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginTop: 8 },
  formField: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
  required: { color: C.error },
  fieldInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 12, height: 44, fontSize: 15, color: C.text, justifyContent: 'center' },
  hintText: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  optionalBadge: { color: C.textMuted, fontWeight: '400' },
  infoBox: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: '#BBDEFB' },
  infoBoxText: { color: '#1565C0', fontSize: 11, lineHeight: 16 },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  checkboxLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  checkboxSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  socialProofRow: { flexDirection: 'row', marginTop: 24, gap: 12 },
  socialProofCol: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.cardBorder },
  socialProofTitle: { fontSize: 14, fontWeight: '800', color: C.saffronDark, marginBottom: 12 },
  proofItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  proofName: { fontSize: 12, color: C.text, flex: 1, paddingRight: 8 },
  proofAmount: { fontSize: 12, fontWeight: '800', color: C.orange },

  summaryCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16 },
  summaryHeader: { fontSize: 16, fontWeight: '800', color: C.saffronDark, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', marginBottom: 8 },
  summaryLabel: { flex: 1, fontSize: 13, color: C.textSoft },
  summaryValue: { flex: 2, fontSize: 13, color: C.text, fontWeight: '500', textAlign: 'right' },
  summaryValueHighlight: { flex: 2, fontSize: 16, color: C.orange, fontWeight: '800', textAlign: 'right' },

  totalBanner: { backgroundColor: C.orange, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalBannerLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  totalBannerAmount: { color: '#fff', fontSize: 24, fontWeight: '900' },

  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.cardBorder, paddingHorizontal: 18, paddingTop: 16, flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: C.orange, borderRadius: 8, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  outlineBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.orange, borderRadius: 8, height: 50, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { color: C.orange, fontSize: 16, fontWeight: '800' },
})
